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
  Square,
  Trash2,
  Send,
  Clock
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
  
  const isLoggedIn = !!localStorage.getItem('edu_session');

  // New local accumulation states
  const [localResults, setLocalResults] = useState<any[]>([]);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState<string>(() => {
    return localStorage.getItem('edu_guest_server_url') || '';
  });

  const profileStr = localStorage.getItem('edu_profile');
  const profile = profileStr ? JSON.parse(profileStr) : null;
  const teacherServerUrl = profile?.serverUrl || '';
  const activeServerUrl = isLoggedIn ? teacherServerUrl : customServerUrl;
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-element";

  const loadLocalResults = async () => {
    const data = await getCollectionData('results');
    const scanned = (data || [])
      .filter((r: any) => r.qr_scanned === true)
      .sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    setLocalResults(scanned);
  };

  useEffect(() => {
    loadLocalResults();
  }, []);

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

  const handleSendToAppsScript = async () => {
    const pendingResults = localResults.filter(r => r.sent_to_server !== true);
    if (pendingResults.length === 0) {
      showAlert({
        title: 'Tidak Ada Data',
        message: 'Semua hasil scan lokal sudah terkirim ke Apps Script.',
        type: 'info'
      });
      return;
    }

    setIsSendingBulk(true);
    let successCount = 0;
    let failCount = 0;
    let lastErrorMsg = '';

    for (const result of pendingResults) {
      const rawUrl = result.serverUrl || activeServerUrl;
      const serverUrl = rawUrl ? rawUrl.trim() : '';
      
      if (!serverUrl || !serverUrl.startsWith('http')) {
        console.warn("Skipping Apps Script send: serverUrl not configured or invalid", serverUrl);
        lastErrorMsg = "URL Apps Script kosong atau tidak valid (harus diawali http/https)";
        failCount++;
        continue;
      }

      try {
        const payload = {
          student: result.student,
          examId: result.examId,
          examTitle: result.examTitle,
          examFileId: result.examFileId,
          score: result.score,
          answers: result.answers,
          answersString: result.answersString,
          startTime: result.startTime,
          endTime: result.endTime,
          timestamp: result.timestamp,
          server_received_at: new Date().toISOString(),
          tabSwitches: result.tabSwitches,
          qr_scanned: result.qr_scanned
        };

        await fetch(serverUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
        
        successCount++;
        
        const currentData = await getCollectionData('results');
        const idx = currentData.findIndex((r: any) => 
          r.student?.code === result.student?.code && r.examFileId === result.examFileId
        );
        if (idx !== -1) {
          currentData[idx].sent_to_server = true;
          currentData[idx].server_received_at = new Date().toISOString();
          if (!currentData[idx].serverUrl) {
            currentData[idx].serverUrl = serverUrl;
          }
          await saveCollection('results', currentData);
        }
      } catch (err: any) {
        console.error("Gagal mengirim ke Apps Script:", err);
        lastErrorMsg = err.message || err.toString();
        failCount++;
      }
    }

    setIsSendingBulk(false);
    await loadLocalResults();

    if (failCount > 0) {
      showAlert({
        title: 'Gagal Mengirim Sebagian Data',
        message: `Gagal mengirim ${failCount} data ke Apps Script. Error: ${lastErrorMsg}. Pastikan URL Apps Script diisi dengan benar dan perangkat terhubung ke internet.`,
        type: 'error'
      });
    } else {
      showAlert({
        title: 'Pengiriman Sukses',
        message: `Berhasil mengirim ${successCount} data hasil ujian ke Apps Script Guru!`,
        type: 'success'
      });
    }
  };

  const handleDeleteLocalResult = async (studentCode: string, examFileId: string) => {
    if (!window.confirm('Yakin ingin menghapus hasil scan ini dari lokal?')) return;

    const currentData = await getCollectionData('results');
    const filtered = currentData.filter((r: any) => 
      !(r.student?.code === studentCode && r.examFileId === examFileId)
    );
    await saveCollection('results', filtered);
    await loadLocalResults();
    showAlert({
      title: 'Berhasil Dihapus',
      message: 'Hasil scan lokal berhasil dihapus.',
      type: 'success'
    });
  };

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
        qr_scanned: true,
        sent_to_server: false,
        serverUrl: parsed.serverUrl || examConfig?.serverUrl
      };

      if (parsed.serverUrl && !isLoggedIn) {
        setCustomServerUrl(parsed.serverUrl);
        localStorage.setItem('edu_guest_server_url', parsed.serverUrl);
      }

      const updatedResults = [...currentResults, newResult];
      await saveCollection('results', updatedResults);

      let alertMsg = `Nilai siswa ${parsed.nama} (${parsed.score}) berhasil disimpan secara lokal. Klik tombol kirim di bawah setelah semua siswa selesai discan.`;

      // 5. Sync ke Google Drive (jika online dan login)
      if (isLoggedIn) {
        try {
          const token = localStorage.getItem('edu_token');
          if (token) {
            const folderId = await getOrCreateRootFolder();
            await saveJsonToDrive(folderId, 'results.json', updatedResults);
            alertMsg = `Nilai siswa ${parsed.nama} (${parsed.score}) berhasil disimpan secara lokal dan disinkronkan ke Google Drive Anda.`;
          }
        } catch (driveErr) {
          console.warn("Gagal sinkronisasi Drive:", driveErr);
        }
      }

      showAlert({
        title: 'Berhasil Disimpan',
        message: alertMsg,
        type: 'success'
      });

      await loadLocalResults();
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

            {!isLoggedIn && (
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-3xl p-5 space-y-4 text-xs text-amber-800 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 text-amber-600 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Mode Pengawas (Belum Login)</span>
                </div>
                <p className="leading-relaxed">
                  Hasil scan saat ini disimpan secara lokal di browser HP/perangkat ini.
                  Silakan <button onClick={() => { stopScanner(); navigate('/login'); }} className="underline font-bold text-amber-900 bg-transparent border-none cursor-pointer p-0 outline-none">Login</button> di perangkat ini agar data otomatis tersinkronisasi ke Google Drive akun Guru Anda.
                </p>
                <div className="space-y-1.5 border-t border-amber-200/40 pt-3">
                  <label className="font-bold text-amber-900">URL Server Apps Script Guru:</label>
                  <input
                    type="text"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={customServerUrl}
                    onChange={(e) => {
                      setCustomServerUrl(e.target.value);
                      localStorage.setItem('edu_guest_server_url', e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl outline-none text-indigo-950 font-bold placeholder:text-slate-300"
                  />
                  <p className="text-[10px] text-amber-600/80 leading-normal">
                    *URL ini otomatis terisi saat memindai QR Code baru dari lembar ujian. Tempelkan URL secara manual di atas jika memindai QR lama yang tidak memiliki info URL server.
                  </p>
                </div>
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

        {/* Scanned List Section */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <h3 className="text-xl font-black text-indigo-950">Daftar Hasil Scan Lokal</h3>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">Daftar hasil scan siswa yang tersimpan di perangkat ini.</p>
            </div>
            <div className="flex items-center gap-3">
              {localResults.filter(r => r.sent_to_server !== true).length > 0 && (
                <button
                  onClick={handleSendToAppsScript}
                  disabled={isSendingBulk}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-600/10 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingBulk ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Kirim {localResults.filter(r => r.sent_to_server !== true).length} Data ke Apps Script
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {localResults.length > 0 ? (
            <div className="overflow-x-auto text-left">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-4 px-4 text-left">Nama Siswa</th>
                    <th className="py-4 px-4 text-left">Kelas / Kode</th>
                    <th className="py-4 px-4 text-left">Ujian</th>
                    <th className="py-4 px-4 text-center">Skor</th>
                    <th className="py-4 px-4 text-center">Status Apps Script</th>
                    <th className="py-4 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                  {localResults.map((res: any, idx: number) => {
                    const isSent = res.sent_to_server === true;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 text-left">
                          <span className="font-extrabold text-indigo-950">{res.student?.nama || res.student?.name}</span>
                        </td>
                        <td className="py-4 px-4 text-left">
                          <div className="space-y-0.5">
                            <p className="text-slate-400 uppercase">{res.student?.kelas || '-'}</p>
                            <p className="font-mono text-[10px] text-slate-300 uppercase">{res.student?.code || '-'}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-left truncate max-w-[200px]">
                          <span className="text-indigo-950">{res.examTitle || 'Ujian (Scan QR)'}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-sm font-black text-indigo-950">{res.score}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center">
                            {isSent ? (
                              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-emerald-100">
                                <CheckCircle className="w-3.5 h-3.5" /> Terkirim
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-amber-100">
                                <Clock className="w-3.5 h-3.5" /> Belum Dikirim
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleDeleteLocalResult(res.student?.code, res.examFileId)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Hapus dari lokal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-dashed border-slate-200">
                <QrCode className="w-6 h-6 text-slate-300" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-600">Belum Ada Hasil Scan</p>
                <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">Gunakan kamera di atas untuk memindai QR hasil ujian dari HP siswa.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
