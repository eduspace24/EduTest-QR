import React from 'react';
import { 
  FileText, 
  Clock, 
  ArrowRight, 
  GraduationCap, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Calendar,
  ChevronRight,
  BellRing,
  QrCode
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudentExams } from '../../hooks/useStudentExams';
import { cn, formatTeacherName } from '../../lib/utils';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { 
    loading, 
    sessionUser, 
    activeExams, 
    dailyExams, 
    semesterExams, 
    roomSeat, 
    isExamCompleted, 
    recentSubmission 
  } = useStudentExams();

  const pendingDaily = dailyExams.filter(e => !isExamCompleted(e));
  const completedDaily = dailyExams.filter(e => isExamCompleted(e));

  const pendingSemester = semesterExams.filter(e => !isExamCompleted(e));
  const completedSemester = semesterExams.filter(e => isExamCompleted(e));

  const totalPending = pendingDaily.length + pendingSemester.length;

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-40 bg-slate-100 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-36 bg-slate-100 rounded-3xl" />
          <div className="h-36 bg-slate-100 rounded-3xl" />
        </div>
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* 1. Header Profil Siswa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
            {(sessionUser?.nama || 'M').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Peserta Didik Aktif
              </span>
              {roomSeat && (
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {roomSeat.roomName} • No. {roomSeat.seatNumber}
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-black text-indigo-950 mt-1">
              Halo, {sessionUser?.nama || 'Murid Nineteen'}!
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kelas: <strong className="text-slate-700">{sessionUser?.kelas || 'Siswa'}</strong>
              {sessionUser?.nisn && ` • NISN: ${sessionUser.nisn}`}
            </p>
          </div>
        </div>

        {recentSubmission && (
          <button
            type="button"
            onClick={() => navigate('/exam/result/finish')}
            className="self-start sm:self-auto px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-slate-500" />
            <span>Lihat Bukti Terakhir</span>
          </button>
        )}
      </div>

      {/* 2. Banner Pemberitahuan Ujian Aktif */}
      {totalPending > 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-5 sm:p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                Pemberitahuan Ujian
              </span>
              <h3 className="text-base sm:text-lg font-black mt-1">
                Terdapat {totalPending} Ujian Siap Dikerjakan
              </h3>
              <p className="text-white/90 text-xs mt-0.5 max-w-xl">
                {pendingDaily.length > 0 && pendingSemester.length > 0
                  ? `Ada ${pendingDaily.length} Ulangan Harian dan ${pendingSemester.length} Ujian Semester aktif untuk kelas Anda.`
                  : pendingDaily.length > 0
                  ? `Ada ${pendingDaily.length} Ulangan Harian yang perlu Anda selesaikan.`
                  : `Ada ${pendingSemester.length} Ujian Akhir Semester resmi yang siap dimulai.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {pendingDaily.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/student/ulangan-harian')}
                className="px-4 py-2.5 bg-white text-orange-950 hover:bg-orange-50 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                Ulangan Harian ({pendingDaily.length}) →
              </button>
            )}
            {pendingSemester.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/student/ujian-semester')}
                className="px-4 py-2.5 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                Ujian Semester ({pendingSemester.length}) →
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Semua ujian aktif saat ini telah Anda selesaikan dengan baik!</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black">
            Lengkap
          </span>
        </div>
      )}

      {/* 3. Dua Kartu Akses Cepat (Ulangan Harian vs Ujian Akhir Semester) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Ulangan Harian */}
        <div 
          onClick={() => navigate('/student/ulangan-harian')}
          className="bg-white p-5 rounded-3xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                {pendingDaily.length > 0 ? `${pendingDaily.length} Aktif` : 'Selesai'}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Ulangan Harian
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
              Latihan soal, penilaian harian formatif, dan kuis materi dari bapak/ibu guru pengampu.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
            <span>Buka Daftar Ulangan Harian</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Ujian Akhir Semester */}
        <div 
          onClick={() => navigate('/student/ujian-semester')}
          className="bg-white p-5 rounded-3xl border border-slate-200/90 hover:border-indigo-950 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-950 flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-indigo-50 text-indigo-950 border border-indigo-200">
                {pendingSemester.length > 0 ? `${pendingSemester.length} Terjadwal` : 'Selesai'}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-950 transition-colors">
              Ujian Akhir Semester
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
              Asesmen sumatif semester resmi sekolah (ASAT / SAS) terikat sesi, waktu, dan penataan ruang meja.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-950 group-hover:translate-x-0.5 transition-transform">
            <span>Buka Ujian Akhir Semester</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 4. Daftar Ringkas Ujian Hari Ini */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Ujian Tersedia Hari Ini ({activeExams.length})
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Klik salah satu ujian untuk langsung memulai pengerjaan.
            </p>
          </div>
        </div>

        {activeExams.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 border-dashed">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">Tidak Ada Ujian Aktif Saat Ini</p>
            <p className="text-xs text-slate-400 mt-0.5">Ujian baru akan muncul otomatis ketika guru mengaktifkannya.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {activeExams.map(exam => {
              const isDone = isExamCompleted(exam);
              const isDaily = exam.exam_type === 'harian';

              return (
                <div
                  key={exam.id}
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 group",
                    isDone 
                      ? "bg-slate-50/70 border-slate-200/80" 
                      : "bg-white border-slate-200 hover:border-slate-400 hover:shadow-md"
                  )}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1",
                        isDaily 
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-200" 
                          : "bg-indigo-950 text-white border border-indigo-900"
                      )}>
                        {isDaily ? <FileText className="w-3 h-3 text-emerald-700" /> : <GraduationCap className="w-3 h-3 text-indigo-300" />}
                        {isDaily ? 'Ulangan Harian' : 'Ujian Semester'}
                      </span>

                      <span className="bg-slate-100 text-slate-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                        {exam.subject || 'Mata Pelajaran'}
                      </span>

                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {exam.duration_minutes || exam.duration || 60} Menit
                      </span>

                      {!isDaily && exam.session_name && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                          {exam.session_name}
                        </span>
                      )}

                      {isDone && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai 1x
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-950 transition-colors">
                      {exam.title}
                    </h4>

                    <p className="text-xs text-slate-400 font-medium">
                      Oleh: <strong className="text-slate-600">{formatTeacherName(exam.teacher_name || 'Guru Pengampu')}</strong>
                      {!isDaily && exam.start_time ? ` • Pkl ${exam.start_time} - ${exam.end_time || ''}` : ' • Waktu Bebas'}
                    </p>
                  </div>

                  {isDone ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selesai
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/exam/result/finish')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                      >
                        Bukti QR
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/test/${exam.teacher_id || 'teacher'}/${exam.id}`)}
                      className={cn(
                        "px-5 py-2.5 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer",
                        isDaily ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-950 hover:bg-indigo-900"
                      )}
                    >
                      <span>Mulai Ujian</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
