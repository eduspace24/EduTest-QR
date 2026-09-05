import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  ArrowRight,
  GraduationCap,
  PartyPopper,
  ShieldCheck,
  ChevronRight,
  QrCode,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function StudentResult() {
  const { participantId } = useParams();
  const [qrString, setQrString] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [cheatFlagged, setCheatFlagged] = useState(false);

  useEffect(() => {
    const savedQr = localStorage.getItem('edu_last_submission_qr');
    const savedMeta = localStorage.getItem('edu_last_submission_meta');
    const flagged = localStorage.getItem('edu_cheat_flagged');
    
    if (savedQr) setQrString(savedQr);
    if (savedMeta) setMeta(JSON.parse(savedMeta));
    if (flagged) {
      setCheatFlagged(true);
      localStorage.removeItem('edu_cheat_flagged');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden relative z-10"
      >
        <div className="h-4 bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-600" />
        
        <div className="p-6 sm:p-12 text-center">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[1.5rem] mx-auto mb-6 flex items-center justify-center shadow-lg"
          >
            <PartyPopper className="w-10 h-10" />
          </motion.div>

          <h1 className="text-3xl font-black text-indigo-950 tracking-tight mb-2">{cheatFlagged ? 'Ujian Diakhiri' : 'Ujian Selesai!'}</h1>
          
          {cheatFlagged && (
            <div className="flex items-start gap-3 px-4 py-3 mb-6 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-xs font-bold max-w-md mx-auto text-left">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <p className="leading-relaxed">Anda terdeteksi melakukan kecurangan (keluar tab). Ujian otomatis diakhiri dan jawaban Anda tetap tersimpan.</p>
            </div>
          )}
          
          {qrString ? (
            <>
              {meta?.submission_mode === 'direct' ? (
                <div className="mb-6 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 rounded-full border border-blue-100 text-xs font-black uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" /> Mode Kirim Langsung (Online CBT)
                  </div>
                  <p className="text-slate-500 text-sm font-bold max-w-md mx-auto">
                    Lembar jawaban Anda telah berhasil <strong>terkirim langsung ke Guru/Admin</strong>. Anda tidak perlu memindai QR Code!
                  </p>
                </div>
              ) : meta?.submission_mode === 'qr' ? (
                <div className="mb-6 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-100 text-xs font-black uppercase tracking-wider">
                    <QrCode className="w-4 h-4 text-emerald-600" /> Mode Scan QR Saja (Offline CBT)
                  </div>
                  <p className="text-slate-500 text-sm font-bold max-w-md mx-auto">
                    Jawaban tersimpan aman di perangkat Anda. Tunjukkan QR Code di bawah ini kepada Pengawas untuk dipindai.
                  </p>
                </div>
              ) : (
                <div className="mb-6 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-950 rounded-full border border-indigo-100 text-xs font-black uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Mode Hybrid (Online & QR Cadangan)
                  </div>
                  <p className="text-slate-500 text-sm font-bold max-w-md mx-auto">
                    Jawaban otomatis terkirim secara online. QR Code di bawah ini dapat dipindai oleh pengawas sebagai bukti kehadiran & cadangan darurat.
                  </p>
                </div>
              )}

              <div className="bg-indigo-950/5 border border-indigo-950/10 rounded-3xl p-6 mb-8 flex flex-col items-center justify-center">
                {meta?.submission_mode === 'direct' ? (
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-4 max-w-xs text-center space-y-3">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-black text-indigo-950">Jawaban Terkirim</h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Data pengerjaan Anda telah tersimpan di server.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-3xl shadow-md border border-slate-100 mb-4">
                    <QRCodeSVG
                      value={qrString}
                      size={240}
                      level="M"
                      includeMargin={true}
                      className="mx-auto"
                    />
                  </div>
                )}
                
                {meta && (
                  <div className="text-center w-full max-w-sm">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Identitas Peserta</p>
                    <p className="text-lg font-black text-indigo-950 leading-tight mb-0.5">{meta.studentName}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{meta.studentKelas}</p>
                    
                    <div className="grid grid-cols-2 gap-3 bg-white/80 p-3 rounded-2xl border border-indigo-950/5">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Mata Ujian</p>
                        <p className="text-xs font-black text-indigo-950 truncate">{meta.examTitle}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Skor Akhir</p>
                        {meta.show_score === false ? (
                          <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded mt-0.5 inline-block">
                            🔒 Dirahasiakan
                          </span>
                        ) : (
                          <p className="text-sm font-black text-indigo-950">{meta.score} / 100</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {meta?.submission_mode === 'direct' ? (
                <div className="flex items-center gap-3 justify-center mb-8 px-4 py-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 text-xs font-bold max-w-md mx-auto">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  <p className="text-left leading-relaxed">Pengerjaan Anda tuntas. Anda dapat langsung mengklik tombol "Selesai & Keluar" di bawah ini.</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 justify-center mb-8 px-4 py-3 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 text-xs font-bold max-w-md mx-auto">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                  <p className="text-left leading-relaxed">PENTING: Jangan tutup halaman ini sebelum Guru memindai QR Code Anda dan mengonfirmasi bahwa data telah masuk!</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-50 rounded-[2rem] p-10 mb-8 border border-slate-100 text-center">
              <h3 className="text-xl font-bold text-indigo-950 mb-2">Pemberitahuan</h3>
              <p className="text-slate-500 font-medium text-sm">Tidak ada lembar pengerjaan terakhir yang ditemukan. Pastikan Anda telah menyelesaikan ujian lewat link resmi.</p>
            </div>
          )}

          <Link 
            to={meta?.examLink || '/student/dashboard'}
            onClick={() => {
              localStorage.removeItem('edu_last_submission_qr');
              localStorage.removeItem('edu_last_submission_meta');
            }}
            className="inline-flex items-center justify-center gap-2 bg-indigo-950 text-white px-10 py-4 rounded-xl font-black text-sm hover:bg-indigo-900 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Selesai & Keluar
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </motion.div>
      
      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 px-5 py-2 bg-white rounded-full shadow-sm border border-slate-100">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Aman & Terverifikasi</p>
        </div>
        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest opacity-50">
          EduTest &copy; 2026 • SaaS Google Workspace Integration
        </p>
      </div>
    </div>
  );
}
