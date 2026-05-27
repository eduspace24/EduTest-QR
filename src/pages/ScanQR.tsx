import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { unpackResult } from '../lib/hash';
import { getCollectionData, saveCollection, getCollection, addToPendingSubmissions } from '../lib/db';
import { useGoogleDrive } from '../context/GoogleDriveContext';
import { useAlert } from '../context/AlertContext';
import { readJsonFromDrive, saveJsonToDrive, getOrCreateRootFolder, fetchExamFromUrl } from '../lib/googleDrive';
import { 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  ArrowLeft,
  QrCode,
  User,
  Activity,
  Check,
  Play,
  Square
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ScanQR() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { syncNow } = useGoogleDrive();
  
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scannedData, setScannedData] = useState<any>(null);
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-element";

  useEffect(() => {
    // 1. Fetch available cameras on mount
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Default to back camera if available, otherwise first camera
          const backCam = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          showAlert({
            title: 'Kamera Tidak Ditemukan',
            message: 'Pastikan perangkat memiliki kamera aktif dan izin kamera telah diberikan.',
            type: 'warning'
          });
        }
      })
      .catch((err) => {
        console.error("Error getting cameras", err);
      });

    return () => {
      // Cleanup on unmount
      stopScanner();
    };
  }, []);

  const startScanner = async (cameraId = selectedCameraId) => {
    if (!cameraId) return;
    setScanStatus('scanning');
    setScannedData(null);

    // Stop current scanner if running
    await stopScanner();

    try {
      const scanner = new Html5Qrcode(scannerId);
      qrScannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.75;
            return { width: size, height: size };
          }
        },
        onScanSuccess,
        (errorMessage) => {
          // Silent failure callback for every frame scan attempt
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error("Gagal memulai kamera scanner:", err);
      setScanStatus('error');
      showAlert({
        title: 'Error Kamera',
        message: 'Gagal mengaktifkan kamera. Pastikan kamera tidak sedang digunakan oleh aplikasi lain.',
        type: 'error'
      });
    }
  };

  const stopScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
      } catch (err) {
        console.error("Gagal menghentikan scanner:", err);
      }
    }
    setIsScanning(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    // Hentikan pemindaian agar tidak tertrigger berkali-kali
    await stopScanner();
    setScanStatus('success');

    const parsed = unpackResult(decodedText);
    if (!parsed) {
      showAlert({
        title: 'QR Code Tidak Valid',
        message: 'Format QR tidak dikenali atau tanda tangan digital (signature) telah rusak/dimanipulasi.',
        type: 'error'
      });
      setScanStatus('idle');
      return;
    }

    setScannedData(parsed);

    try {
      // 1. Ambil konfigurasi soal ujian (lokal/cloud) untuk pemetaan kunci jawaban
      let examConfig = null;
      const localConfig = await getCollection('exam_' + parsed.driveFileId);
      if (localConfig && localConfig.data) {
        examConfig = localConfig.data;
      } else {
        // Coba ambil dari cloud jika token aktif
        const token = localStorage.getItem('edu_token');
        if (token) {
          try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${parsed.driveFileId}?alt=media`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              examConfig = await response.json();
            }
          } catch (e) {
            console.warn("Drive API fetch failed, trying GAS URL fallback...");
          }
        }

        // Fallback: ambil lewat Apps Script proxy (jika scanner tidak login)
        if (!examConfig) {
          try {
            examConfig = await fetchExamFromUrl(parsed.driveFileId);
          } catch (e) {
            console.warn("Apps Script exam fetch failed:", e);
          }
        }

        if (examConfig) {
          // Simpan cache lokal
          await saveCollection('exam_' + parsed.driveFileId, examConfig);
        }
      }

      // 2. Petakan string jawaban kembali ke objek answers { [qId]: optionId }
      const answers: Record<string, string> = {};
      if (examConfig && examConfig.questions) {
        examConfig.questions.forEach((q: any, idx: number) => {
          const ansChar = parsed.answersString[idx];
          if (ansChar && ansChar !== '-') {
            answers[q.id] = ansChar;
          }
        });
      }

      // 3. Masukkan ke IndexedDB results
      const currentResults = await getCollectionData('results');
      
      // Validasi duplikasi pengerjaan
      const isDuplicate = currentResults.some((r: any) => 
        r.student?.code === parsed.code && r.examFileId === parsed.driveFileId
      );

      if (isDuplicate) {
        showAlert({
          title: 'Hasil Sudah Ada',
          message: `Hasil ujian untuk siswa "${parsed.nama}" pada sesi ini sudah pernah terekam sebelumnya.`,
          type: 'warning'
        });
        setScanStatus('idle');
        return;
      }

      const newResult = {
        student: {
          nama: parsed.nama,
          kelas: parsed.kelas,
          code: parsed.code,
          role: 'siswa'
        },
        examId: parsed.driveFileId,
        examTitle: parsed.examTitle || examConfig?.title || 'Ujian (Scan QR)',
        examFileId: parsed.driveFileId,
        score: parsed.score,
        answers,
        answersString: parsed.answersString,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        timestamp: new Date().toISOString(),
        server_received_at: new Date().toISOString(),
        tabSwitches: parsed.tabSwitches,
        qr_scanned: true
      };

      const updatedResults = [...currentResults, newResult];
      await saveCollection('results', updatedResults);

      // 4. Kirim langsung ke Apps Script jika serverUrl tersedia
      const serverUrl = parsed.serverUrl || examConfig?.serverUrl;
      let sentToGas = false;
      if (serverUrl) {
        try {
          await fetch(serverUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(newResult)
          });
          sentToGas = true;
          console.log("Scan result sent successfully to Apps Script");
        } catch (postErr) {
          console.warn("Gagal mengirim langsung ke Apps Script, menyimpan ke antrean offline:", postErr);
          await addToPendingSubmissions({
            ...newResult,
            serverUrl
          });
        }
      }

      // 5. Sync ke Google Drive (jika online dan login)
      try {
        const token = localStorage.getItem('edu_token');
        if (!token) throw new Error("No token, not logged in");

        const folderId = await getOrCreateRootFolder();
        await saveJsonToDrive(folderId, 'results.json', updatedResults);
        showAlert({
          title: 'Pemindaian Sukses!',
          message: `Nilai siswa ${parsed.nama} (${parsed.score}) telah terekam dan sukses disinkronkan ke Google Drive.`,
          type: 'success'
        });
      } catch (driveErr) {
        console.warn("Gagal sinkronisasi Drive:", driveErr);
        
        const isLoggedIn = !!localStorage.getItem('edu_session');
        let alertMsg = '';
        
        if (isLoggedIn) {
          alertMsg = `Nilai siswa ${parsed.nama} (${parsed.score}) berhasil disimpan secara offline di perangkat Anda. Data akan disinkronkan otomatis begitu online.`;
        } else {
          if (sentToGas) {
            alertMsg = `Nilai siswa ${parsed.nama} (${parsed.score}) berhasil dikirim ke Server Apps Script Guru. Anda bisa langsung melakukan 'Tarik Data' di akun utama Anda.`;
          } else {
            alertMsg = `Nilai siswa ${parsed.nama} (${parsed.score}) disimpan secara lokal di browser ini. Data akan dikirim otomatis ke Server Apps Script Guru begitu perangkat terhubung ke internet.`;
          }
        }

        showAlert({
          title: isLoggedIn ? 'Tersimpan di Lokal' : (sentToGas ? 'Pengiriman Sukses' : 'Tersimpan Offline'),
          message: alertMsg,
          type: isLoggedIn ? 'success' : (sentToGas ? 'success' : 'warning')
        });
      }
    } catch (err: any) {
      console.error(err);
      showAlert({
        title: 'Gagal Menyimpan',
        message: 'Terjadi kesalahan sistem saat menyimpan nilai siswa.',
        type: 'error'
      });
    }

    setScanStatus('idle');
  };

  const isLoggedIn = !!localStorage.getItem('edu_session');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { stopScanner(); navigate(isLoggedIn ? '/hasil-ujian' : '/login'); }} 
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-indigo-950" />
          </button>
          <div>
            <h2 className="tracking-tight mb-0.5 font-black text-indigo-950 text-lg sm:text-xl md:text-2xl">Pindai QR Hasil Ujian</h2>
            <p className="text-slate-500 text-xs sm:text-sm font-medium">Arahkan kamera perangkat Anda ke layar HP siswa yang menampilkan QR Code.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Camera Scanner */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative min-h-[350px] flex flex-col items-center justify-center">
              
              {/* Camera viewport frame */}
              <div className="w-full max-w-sm aspect-square bg-slate-950 rounded-3xl overflow-hidden relative border border-slate-200/50 shadow-inner flex items-center justify-center">
                <div id={scannerId} className="w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_video]:rounded-3xl"></div>
                
                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-950/95 backdrop-blur-sm">
                    <div className="bg-slate-900 p-4 rounded-full border border-slate-800 text-slate-300 shadow-lg">
                      <Camera className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Kamera Nonaktif</p>
                  </div>
                )}

                {isScanning && (
                  <div className="absolute inset-0 border-[3px] border-emerald-500 rounded-3xl pointer-events-none animate-pulse">
                    <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-emerald-500/80 shadow-md shadow-emerald-500/50 animate-[bounce_3s_infinite]" />
                  </div>
                )}
              </div>

              {/* Camera Select dropdown & controls */}
              <div className="w-full max-w-sm mt-6 flex flex-col sm:flex-row gap-3">
                {cameras.length > 0 ? (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      if (isScanning) startScanner(e.target.value);
                    }}
                    className="flex-1 bg-slate-50 text-indigo-950 font-bold border border-slate-200 px-4 py-3 rounded-2xl outline-none text-xs focus:ring-2 focus:ring-indigo-950/10 cursor-pointer transition-all"
                  >
                    {cameras.map(cam => (
                      <option key={cam.id} value={cam.id} className="text-indigo-950">{cam.label || `Kamera ${cam.id.substring(0, 5)}`}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex-1 text-center text-slate-400 text-xs py-3 border border-dashed border-slate-200 rounded-2xl bg-slate-50 font-bold">
                    Mencari kamera aktif...
                  </div>
                )}

                <button
                  onClick={() => isScanning ? stopScanner() : startScanner()}
                  className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                    isScanning 
                      ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/10' 
                      : 'bg-indigo-950 text-white hover:bg-indigo-900 shadow-indigo-950/10'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <Square className="w-4 h-4" /> Stop Kamera
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" /> Start Kamera
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Instructions and Scanned Preview */}
          <div className="space-y-6">
            {/* Quick Stats/Connection Card */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-950">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status Koneksi</p>
                  <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5 leading-none">
                    {navigator.onLine ? (
                      <>
                        <Wifi className="w-4 h-4 text-emerald-500" /> Online Mode
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-amber-500" /> Offline Mode (Lokal)
                      </>
                    )}
                  </h4>
                </div>
              </div>
            </div>

            {/* Guest mode warning box */}
            {!isLoggedIn && (
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-3xl p-5 space-y-2 text-xs text-amber-800 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 text-amber-600 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Mode Pengawas (Belum Login)</span>
                </div>
                <p className="leading-relaxed">
                  Hasil scan saat ini disimpan secara lokal di browser HP/perangkat ini.
                  Silakan <button onClick={() => { stopScanner(); navigate('/login'); }} className="underline font-bold text-amber-900 bg-transparent border-none cursor-pointer p-0 outline-none">Login</button> di perangkat ini agar data otomatis tersinkronisasi ke Google Drive akun Guru Anda.
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-indigo-950">Petunjuk Pemindaian</h3>
              <ul className="space-y-3 text-xs text-slate-500 font-medium">
                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</div>
                  <p>Klik tombol <strong>"Start Kamera"</strong> untuk mengaktifkan pemindai.</p>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</div>
                  <p>Posisikan QR Code di HP siswa berada di dalam kotak pemindai.</p>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</div>
                  <p>Sistem akan memvalidasi data secara otomatis. Lampu indikator hijau akan menyala setelah sukses disimpan.</p>
                </li>
              </ul>
            </div>

            {/* Scanned data card preview */}
            {scannedData && (
              <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm shadow-emerald-500/5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950">Siswa Terdeteksi</h4>
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Berhasil Disimpan</p>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Nama:</span>
                    <span className="font-bold text-indigo-950">{scannedData.nama}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Kelas:</span>
                    <span className="font-bold text-indigo-950">{scannedData.kelas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Kode:</span>
                    <span className="font-bold font-mono text-indigo-950">{scannedData.code}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-3.5 items-center">
                    <span className="text-slate-400 font-medium">Skor Ujian:</span>
                    <span className="text-xl font-black text-emerald-600">{scannedData.score}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
