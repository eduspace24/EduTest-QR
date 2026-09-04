import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { unpackResult } from '../lib/hash';
import { getCollectionData, saveCollection } from '../lib/db';
import { useAlert } from '../context/AlertContext';
import { supabase } from '../lib/supabase';
import { formatStudentName } from '../lib/utils';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ArrowLeft,
  QrCode,
  User,
  Activity,
  Play,
  Square,
  Trash2,
  Send,
  Clock,
  Download,
  ShieldAlert,
  GraduationCap,
  Layers,
  Sparkles,
  Check,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ScanQR() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [roomName, setRoomName] = useState<string>('Ruang 1');
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  const [scannedQueue, setScannedQueue] = useState<any[]>([]);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [lastScannedStudent, setLastScannedStudent] = useState<any>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sound feedback on scan
  const playBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  useEffect(() => {
    // Load local results and distributed rooms
    const loadLocal = async () => {
      const local = await getCollectionData('results');
      if (local && local.length > 0) {
        setScannedQueue(local);
      }
      const savedDistribution = await getCollectionData('exam_rooms_distribution');
      if (savedDistribution && savedDistribution.length > 0) {
        const roomNames = savedDistribution.map((r: any) => r.name || `Ruang ${r.roomNumber}`);
        setAvailableRooms(roomNames);
        if (roomNames.length > 0) {
          setRoomName(roomNames[0]);
        }
      }
    };
    loadLocal();

    // Init Camera List
    Html5Qrcode.getCameras().then((devices) => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('belakang') ||
          d.label.toLowerCase().includes('rear')
        );
        setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
      }
    }).catch(err => {
      console.warn("Camera init warning:", err);
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    if (!selectedCameraId) return;
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }
      
      setIsScanning(true);
      await scannerRef.current.start(
        selectedCameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0
        },
        onScanSuccess,
        () => {} // silent on frame fail
      );
    } catch (err) {
      console.error(err);
      setIsScanning(false);
      showAlert({ title: 'Gagal Membuka Kamera', message: 'Pastikan izin kamera diizinkan pada browser.', type: 'error' });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      // 1. Unpack cryptographic payload
      const parsed = unpackResult(decodedText);
      if (!parsed || !parsed.nama) {
        return;
      }

      playBeep();

      const studentKey = `${parsed.code || parsed.nama}_${parsed.examTitle || 'exam'}`;
      
      // 2. Anti-Duplicate Protection Check
      const existingIndex = scannedQueue.findIndex(item => 
        (item.student_code && item.student_code === parsed.code) ||
        (item.student?.code && item.student?.code === parsed.code) ||
        (item.student_name === parsed.nama && item.exam_title === parsed.examTitle)
      );

      const newRecord = {
        id: crypto.randomUUID(),
        room_name: roomName,
        exam_id: parsed.driveFileId || crypto.randomUUID(),
        exam_title: parsed.examTitle || 'Ujian Sekolah',
        student_name: parsed.nama,
        student_class: parsed.kelas,
        student_code: parsed.code,
        score: parsed.score,
        answers_summary: parsed.answersString,
        tab_switches: parsed.tabSwitches || 0,
        start_time: parsed.startTime,
        end_time: parsed.endTime,
        scanned_at: new Date().toISOString(),
        is_sent: false
      };

      let updatedList: any[] = [];

      if (existingIndex >= 0) {
        // Update existing record
        updatedList = [...scannedQueue];
        updatedList[existingIndex] = { ...newRecord, is_sent: scannedQueue[existingIndex].is_sent };
        showAlert({ 
          title: 'Data Murid Diperbarui', 
          message: `Nilai ${parsed.nama} (NIS: ${parsed.code}) diperbarui menjadi ${parsed.score}.`, 
          type: 'warning' 
        });
      } else {
        // Add new
        updatedList = [newRecord, ...scannedQueue];
      }

      setScannedQueue(updatedList);
      setLastScannedStudent(newRecord);
      await saveCollection('results', updatedList);

    } catch (err) {
      console.warn("Parse scan error:", err);
    }
  };

  // 3. Batch send room results to Supabase in 1 single HTTP payload
  const handleSendBatchToSupabase = async () => {
    const unsentRecords = scannedQueue.filter(r => !r.is_sent);
    if (unsentRecords.length === 0) {
      showAlert({ title: 'Semua Data Sudah Terkirim', message: 'Seluruh nilai murid di ruangan ini sudah tersinkron ke Supabase.', type: 'info' });
      return;
    }

    setIsSendingBatch(true);
    try {
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, ID } = await import('../lib/appwrite');

      for (const r of unsentRecords) {
        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.EXAM_RESULTS,
          ID.unique(),
          {
            exam_title: r.exam_title || 'Ujian',
            student_name: r.student_name || r.student?.nama || '-',
            student_class: r.student_class || r.student?.kelas || '-',
            student_code: r.student_code || r.student?.code || '-',
            score: Number(r.score) || 0,
            answers_summary: r.answers_summary || r.answersString || '',
            tab_switches: Number(r.tab_switches) || 0,
            start_time: r.start_time || r.startTime || '',
            end_time: r.end_time || r.endTime || ''
          }
        );
      }

      // Mark all as sent
      const updated = scannedQueue.map(r => ({ ...r, is_sent: true }));
      setScannedQueue(updated);
      await saveCollection('results', updated);

      showAlert({
        title: 'Berhasil Terkirim ke Server! 🚀',
        message: `Sebanyak ${unsentRecords.length} nilai murid di ${roomName} berhasil dikirim ke server Appwrite!`,
        type: 'success'
      });
    } catch (err: any) {
      console.error(err);
      showAlert({
        title: 'Gagal Mengirim ke Server',
        message: err.message || 'Periksa koneksi internet Anda lalu coba kirim kembali.',
        type: 'error'
      });
    } finally {
      setIsSendingBatch(false);
    }
  };

  // 4. Export Room Recap to Excel
  const handleExportExcel = () => {
    if (scannedQueue.length === 0) {
      showAlert({ title: 'Data Kosong', message: 'Belum ada murid yang dipindai di ruangan ini.', type: 'warning' });
      return;
    }

    const rows = scannedQueue.map((item, idx) => ({
      'No': idx + 1,
      'Ruang Ujian': item.room_name || roomName,
      'Nama Murid': formatStudentName(item.student_name || item.student?.nama || 'Murid'),
      'NIS': item.student_code || item.student?.code,
      'Kelas': item.student_class || item.student?.kelas,
      'Mata Pelajaran / Ujian': item.exam_title,
      'Nilai Skor': item.score,
      'Pelanggaran (Pindah Tab)': item.tab_switches || 0,
      'Status Server': item.is_sent ? 'Terkirim ke Supabase' : 'Tersimpan Lokal',
      'Waktu Scan': item.scanned_at || item.timestamp
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Ruang Ujian');
    XLSX.writeFile(wb, `Rekap_Nilai_${roomName.replace(/\s+/g, '_')}_NineteenExam.xlsx`);
  };

  const handleClearRoomData = () => {
    showAlert({
      title: 'Kosongkan Antrean Ruangan?',
      message: 'Pastikan Anda sudah mengirimkan rekap nilai ke server atau mengekspor Excel sebelum mengosongkan antrean.',
      type: 'confirm',
      confirmText: 'Ya, Kosongkan',
      onConfirm: async () => {
        setScannedQueue([]);
        setLastScannedStudent(null);
        await saveCollection('results', []);
      }
    });
  };

  const unsentCount = scannedQueue.filter(r => !r.is_sent).length;
  const sentCount = scannedQueue.filter(r => r.is_sent).length;

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/dashboard');
              }
            }}
            className="group mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-950 transition-colors bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-xl shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            Kembali
          </button>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Mode Offline-First Batching
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1">
            Pindai QR Barcode Pengawas
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Pindai seluruh murid di ruangan secara offline. Setelah selesai, kirim sekaligus ke server dalam 1 klik.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Ekspor Excel Ruangan
          </button>

          {scannedQueue.length > 0 && (
            <button
              onClick={handleClearRoomData}
              className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
              title="Kosongkan Antrean Ruang"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Scanner & Queue Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Camera Viewfinder */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-5">
            {/* Room Selector */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <Layers className="w-5 h-5 text-indigo-950 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Nama Ruang / Sesi Ujian
                  </label>
                  {availableRooms.length > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {availableRooms.length} Ruang Terdaftar
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  list="room-options"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Pilih atau ketik ruangan..."
                  className="w-full bg-transparent font-bold text-indigo-950 text-sm outline-none"
                />
                <datalist id="room-options">
                  {availableRooms.map((r, idx) => (
                    <option key={idx} value={r} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Camera Box */}
            <div className="relative aspect-square bg-slate-900 rounded-[2rem] overflow-hidden flex flex-col items-center justify-center border-4 border-slate-100 shadow-inner">
              <div id="reader" className="w-full h-full" />
              
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white space-y-4 bg-indigo-950/90 backdrop-blur-sm">
                  <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center border border-white/20">
                    <Camera className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Kamera Belum Aktif</h4>
                    <p className="text-xs text-slate-300 max-w-xs mt-1">
                      Arahkan kamera ke layar barcode murid saat mereka selesai ujian.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="space-y-3">
              {cameras.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  disabled={isScanning}
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 outline-none"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>{c.label || `Kamera ${c.id.slice(0, 5)}`}</option>
                  ))}
                </select>
              )}

              {!isScanning ? (
                <button
                  onClick={startScanner}
                  className="w-full py-4 bg-indigo-950 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Buka Kamera Scanner</span>
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Hentikan Kamera</span>
                </button>
              )}
            </div>
          </div>

          {/* Last Scanned Card */}
          {lastScannedStudent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500 text-white p-6 rounded-[2rem] shadow-lg shadow-emerald-500/20 flex items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-100 uppercase tracking-wider">
                  <Check className="w-4 h-4" />
                  Baru Saja Dipindai
                </div>
                <h4 className="text-base font-black mt-0.5">{formatStudentName(lastScannedStudent.student_name)}</h4>
                <p className="text-xs text-emerald-100">
                  NIS: {lastScannedStudent.student_code} • Kelas {lastScannedStudent.student_class}
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black">{lastScannedStudent.score}</span>
                <span className="text-xs text-emerald-100 block">Nilai</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column: Room Queue & Batch Submit */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Batch Submit Card */}
          <div className="bg-gradient-to-br from-indigo-950 to-blue-950 text-white p-7 rounded-[2.5rem] shadow-xl shadow-indigo-950/20 relative overflow-hidden space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                  Status Rekap Ruangan
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">{roomName}</h3>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-white">{scannedQueue.length}</span>
                <span className="text-xs text-slate-300 block font-medium">Murid Terpindai</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <p className="text-slate-400 font-medium">Antrean Belum Dikirim:</p>
                <p className="text-base font-black text-amber-400">{unsentCount} Murid</p>
              </div>
              <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <p className="text-slate-400 font-medium">Tersinkron ke Server:</p>
                <p className="text-base font-black text-emerald-400">{sentCount} Murid</p>
              </div>
            </div>

            <button
              onClick={handleSendBatchToSupabase}
              disabled={isSendingBatch || unsentCount === 0}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingBatch ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Rekap Ruangan ke Server Supabase ({unsentCount} Murid)</span>
                </>
              )}
            </button>
          </div>

          {/* Scanned List Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-indigo-950">Daftar Murid di Ruangan</h3>
              <span className="text-xs text-slate-400 font-bold">Total: {scannedQueue.length} Murid</span>
            </div>

            {scannedQueue.length === 0 ? (
              <div className="py-12 text-center px-4">
                <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-black text-indigo-950">Belum Ada Murid yang Discan</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 font-medium">
                  Nyalakan kamera di sebelah kiri dan pindai QR hasil ujian murid satu per satu.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto pr-1">
                {scannedQueue.map((item, idx) => (
                  <div key={item.id || idx} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 font-black flex items-center justify-center text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-indigo-950 text-sm leading-tight">
                          {formatStudentName(item.student_name || item.student?.nama || 'Murid')}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-0.5">
                          <span>NIS: {item.student_code || item.student?.code}</span>
                          <span>•</span>
                          <span>Kelas {item.student_class || item.student?.kelas}</span>
                          {item.tab_switches > 0 && (
                            <span className="text-rose-500 font-bold flex items-center gap-0.5">
                              <ShieldAlert className="w-3 h-3" /> {item.tab_switches}x Pindah Tab
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-black text-indigo-950 text-base">{item.score}</span>
                        <span className="text-[10px] text-slate-400 block font-medium">Skor</span>
                      </div>
                      {item.is_sent ? (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                          <Check className="w-3 h-3" /> Terkirim
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-200">
                          <Clock className="w-3 h-3" /> Antrean
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
