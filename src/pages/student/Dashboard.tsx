import React from 'react';
import { 
  FileText, 
  Clock, 
  ArrowRight, 
  GraduationCap, 
  CheckCircle2, 
  QrCode
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudentExams } from '../../hooks/useStudentExams';
import { cn, resolveExamType } from '../../lib/utils';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { 
    loading, 
    sessionUser, 
    activeExams, 
    isExamCompleted, 
    recentSubmission 
  } = useStudentExams();

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-36 bg-slate-100 rounded-3xl" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* 1. Papan Nama Header Berwarna Biru Gelap Khas Aplikasi (Solid Tanpa Gradasi) */}
      <div className="bg-indigo-950 text-white p-6 sm:p-7 rounded-3xl shadow-card relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5 border border-indigo-900/60">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-white text-indigo-950 flex items-center justify-center font-black text-xl shadow-soft shrink-0">
            {(sessionUser?.nama || 'M').charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/10 border border-white/15 text-slate-200 px-2.5 py-0.5 rounded-full inline-block">
              Murid
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Halo, {sessionUser?.nama || 'Murid Nineteen'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Kelas: <strong className="text-white font-bold">{sessionUser?.kelas || 'Siswa'}</strong>
            </p>
          </div>
        </div>

        {recentSubmission && (
          <button
            type="button"
            onClick={() => navigate('/exam/result/finish')}
            className="self-start sm:self-auto px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-soft z-10 active:scale-95"
          >
            <QrCode className="w-4 h-4 text-slate-300" />
            <span>Bukti Hasil Ujian</span>
          </button>
        )}
      </div>

      {/* 2. Daftar Ujian & Ulangan yang Sedang Aktif */}
      <div className="space-y-3.5 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Ujian & Ulangan Aktif ({activeExams.length})
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Klik salah satu ujian untuk membuka rincian dan halaman pengerjaan.
            </p>
          </div>
        </div>

        {activeExams.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 border-dashed shadow-soft">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-base">Tidak Ada Ujian atau Ulangan Aktif</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Saat ini belum ada ulangan harian maupun jadwal asesmen semester yang diaktifkan untuk kelas Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {activeExams.map(exam => {
              const isDone = isExamCompleted(exam);
              const isDaily = resolveExamType(exam) === 'harian';
              const targetPage = isDaily ? '/student/ulangan-harian' : '/student/ujian-semester';

              return (
                <div
                  key={exam.id}
                  onClick={() => navigate(targetPage)}
                  className={cn(
                    "p-5 sm:p-5.5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 cursor-pointer group",
                    isDone 
                      ? "bg-slate-50/70 border-slate-200/70 hover:bg-slate-50" 
                      : "bg-white border-slate-200/85 shadow-soft hover:shadow-card hover:-translate-y-0.5 hover:border-slate-300"
                  )}
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1",
                        isDaily 
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                          : "bg-indigo-950 text-white border border-indigo-900"
                      )}>
                        {isDaily ? <FileText className="w-3 h-3 text-emerald-600" /> : <GraduationCap className="w-3 h-3 text-indigo-300" />}
                        {isDaily ? 'Ulangan Harian' : 'Ujian Semester'}
                      </span>

                      <span className="bg-slate-100/90 text-slate-700 border border-slate-200/60 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                        {exam.subject || 'Mata Pelajaran'}
                      </span>

                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {exam.duration_minutes || exam.duration || 60} Menit
                      </span>

                      {!isDaily && exam.session_name && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200/60 px-2 py-0.5 rounded-md font-bold">
                          {exam.session_name}
                        </span>
                      )}

                      {isDone && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 font-black px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-950 transition-colors">
                      {exam.title}
                    </h3>

                    {!isDaily && exam.start_time && (
                      <p className="text-xs text-slate-500 font-medium">
                        Pukul {exam.start_time} - {exam.end_time || 'Selesai'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isDone ? (
                      <div className="flex items-center gap-2">
                        <span className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selesai
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/exam/result/finish');
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer border border-slate-200/60"
                        >
                          Bukti QR
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(targetPage);
                        }}
                        className="px-4 py-2.5 bg-indigo-50/80 border border-indigo-100 text-indigo-950 group-hover:bg-indigo-950 group-hover:text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-soft active:scale-95"
                      >
                        <span>Buka</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
