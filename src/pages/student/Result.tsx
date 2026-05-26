import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  ArrowRight,
  GraduationCap,
  PartyPopper,
  ShieldCheck,
  ChevronRight,
  QrCode,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function StudentResult() {
  const { participantId } = useParams();
  const [qrString, setQrString] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    const savedQr = localStorage.getItem('edu_last_submission_qr');
    const savedMeta = localStorage.getItem('edu_last_submission_meta');
    
    if (savedQr) setQrString(savedQr);
    if (savedMeta) setMeta(JSON.parse(savedMeta));
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

          <h1 className="text-3xl font-black text-indigo-950 tracking-tight mb-2">Ujian Selesai!</h1>
          
          {qrString ? (
            <>
              <p className="text-slate-500 text-sm font-bold mb-6 max-w-md mx-auto">
                Jawaban Anda telah tersimpan secara aman di HP Anda. Tunjukkan QR Code di bawah ini kepada Guru/Pengawas untuk dipindai.
              </p>

              <div className="bg-indigo-950/5 border border-indigo-950/10 rounded-3xl p-6 mb-8 flex flex-col items-center justify-center">
                <div className="bg-white p-4 rounded-3xl shadow-md border border-slate-100 mb-4">
                  <QRCodeSVG
                    value={qrString}
                    size={240}
                    level="M"
                    includeMargin={true}
                    className="mx-auto"
                  />
                </div>
                
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
                        <p className="text-sm font-black text-indigo-950">{meta.score}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3 justify-center mb-8 px-4 py-3 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 text-xs font-bold max-w-md mx-auto">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <p className="text-left leading-relaxed">PENTING: Jangan tutup halaman ini sebelum Guru memindai QR Code Anda dan mengonfirmasi bahwa data telah masuk!</p>
              </div>
            </>
          ) : (
            <div className="bg-slate-50 rounded-[2rem] p-10 mb-8 border border-slate-100 text-center">
              <h3 className="text-xl font-bold text-indigo-950 mb-2">Pemberitahuan</h3>
              <p className="text-slate-500 font-medium text-sm">Tidak ada QR Code pengerjaan terakhir yang ditemukan. Pastikan Anda telah menyelesaikan ujian lewat link resmi.</p>
            </div>
          )}

          <Link 
            to="/exam"
            onClick={() => {
              localStorage.removeItem('edu_last_submission_qr');
              localStorage.removeItem('edu_last_submission_meta');
            }}
            className="inline-flex items-center justify-center gap-2 bg-indigo-950 text-white px-10 py-4 rounded-xl font-black text-sm hover:bg-indigo-900 transition-all shadow-md active:scale-95"
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
          EduTest Lite &copy; 2026 • SaaS Google Workspace Integration
        </p>
      </div>
    </div>
  );
}
