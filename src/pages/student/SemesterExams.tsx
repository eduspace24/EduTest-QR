import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Search, 
  Building2, 
  Calendar,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudentExams, StudentExamItem } from '../../hooks/useStudentExams';
import { cn, formatTeacherName } from '../../lib/utils';

export default function SemesterExams() {
  const navigate = useNavigate();
  const { loading, sessionUser, semesterExams, roomSeat, isExamCompleted } = useStudentExams();
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExams = useMemo(() => {
    return semesterExams.filter(exam => {
      const isDone = isExamCompleted(exam);
      if (filterTab === 'pending' && isDone) return false;
      if (filterTab === 'completed' && !isDone) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (exam.title || '').toLowerCase().includes(q);
        const subjectMatch = (exam.subject || '').toLowerCase().includes(q);
        const sessionMatch = (exam.session_name || '').toLowerCase().includes(q);
        return titleMatch || subjectMatch || sessionMatch;
      }
      return true;
    });
  }, [semesterExams, filterTab, searchQuery, isExamCompleted]);

  const pendingCount = semesterExams.filter(e => !isExamCompleted(e)).length;
  const completedCount = semesterExams.filter(e => isExamCompleted(e)).length;

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-32 bg-slate-100 rounded-3xl" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Bersih & Ringkas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-indigo-950" /> Ujian Akhir Semester
            </h1>
            {semesterExams.length > 0 && roomSeat && (
              <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                <Building2 className="w-3.5 h-3.5" /> {roomSeat.roomName} • Meja {roomSeat.seatNumber}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Jadwal asesmen semester kelas {sessionUser?.kelas || 'murid'}.
          </p>
        </div>

        <button
          onClick={() => navigate('/student/dashboard')}
          className="self-start sm:self-auto text-slate-600 hover:text-indigo-950 text-xs font-bold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Beranda
        </button>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl self-start">
          <button
            onClick={() => setFilterTab('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer",
              filterTab === 'all'
                ? "bg-white text-indigo-950 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Semua Jadwal ({semesterExams.length})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5",
              filterTab === 'pending'
                ? "bg-indigo-950 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Belum Dikerjakan
            {pendingCount > 0 && (
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                filterTab === 'pending' ? "bg-white text-indigo-950" : "bg-indigo-100 text-indigo-950"
              )}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer",
              filterTab === 'completed'
                ? "bg-white text-indigo-950 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Riwayat Selesai ({completedCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mapel atau judul..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:border-indigo-900 transition-all"
          />
        </div>
      </div>

      {/* List Kartu Ujian Akhir Semester */}
      {filteredExams.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 border-dashed">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">
            {semesterExams.length === 0 
              ? 'Belum Ada Ujian Semester Aktif' 
              : 'Tidak Ada Jadwal Ujian Sesuai Filter'}
          </h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto mt-1">
            {semesterExams.length === 0
              ? 'Panitia ujian belum mengaktifkan jadwal asesmen semester untuk jenjang kelas Anda.'
              : 'Silakan pilih tab filter lainnya atau bersihkan kata kunci pencarian.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredExams.map(exam => {
            const isDone = isExamCompleted(exam);

            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 group",
                  isDone 
                    ? "bg-slate-50/70 border-slate-200/80" 
                    : "bg-white border-slate-200/90 hover:border-indigo-950 hover:shadow-md"
                )}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-indigo-950 text-white border border-indigo-900 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-indigo-300" /> Ujian Semester
                    </span>

                    <span className="bg-indigo-50 text-indigo-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      {exam.subject || 'Mata Pelajaran'}
                    </span>

                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {exam.duration_minutes || exam.duration || 60} Menit
                    </span>

                    {exam.session_name && (
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-bold">
                        {exam.session_name}
                      </span>
                    )}

                    {roomSeat && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {roomSeat.roomName} (Meja {roomSeat.seatNumber})
                      </span>
                    )}

                    {isDone && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai 1x
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-950 transition-colors">
                    {exam.title}
                  </h3>

                  <p className="text-xs text-slate-400 font-medium">
                    Panitia / Pengampu: <strong className="text-slate-600">{formatTeacherName(exam.teacher_name || 'Panitia ASAT')}</strong>
                    {exam.start_time && ` • Pukul ${exam.start_time} - ${exam.end_time || 'Selesai'}`}
                  </p>
                </div>

                {isDone ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-4 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ujian Selesai
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/exam/result/finish')}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                      title="Lihat Bukti Pengiriman"
                    >
                      Bukti Hasil
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/test/${exam.teacher_id || 'teacher'}/${exam.id}`)}
                    className="px-6 py-3 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-950/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    <span>Mulai Ujian</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
