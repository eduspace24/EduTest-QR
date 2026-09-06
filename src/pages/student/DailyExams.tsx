import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Search, 
  GraduationCap, 
  Sparkles, 
  Filter,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudentExams, StudentExamItem } from '../../hooks/useStudentExams';
import { cn } from '../../lib/utils';

export default function DailyExams() {
  const navigate = useNavigate();
  const { loading, sessionUser, dailyExams, isExamCompleted } = useStudentExams();
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExams = useMemo(() => {
    return dailyExams.filter(exam => {
      const isDone = isExamCompleted(exam);
      if (filterTab === 'pending' && isDone) return false;
      if (filterTab === 'completed' && !isDone) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (exam.title || '').toLowerCase().includes(q);
        const subjectMatch = (exam.subject || '').toLowerCase().includes(q);
        const teacherMatch = (exam.teacher_name || '').toLowerCase().includes(q);
        return titleMatch || subjectMatch || teacherMatch;
      }
      return true;
    });
  }, [dailyExams, filterTab, searchQuery, isExamCompleted]);

  const pendingCount = dailyExams.filter(e => !isExamCompleted(e)).length;
  const completedCount = dailyExams.filter(e => isExamCompleted(e)).length;

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
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" /> Ulangan Harian
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Daftar ulangan dan kuis kelas {sessionUser?.kelas || 'murid'}.
          </p>
        </div>

        <button
          onClick={() => navigate('/student/dashboard')}
          className="text-slate-600 hover:text-indigo-950 text-xs font-bold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Beranda
        </button>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/60 p-1 rounded-2xl self-start">
          <button
            onClick={() => setFilterTab('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer",
              filterTab === 'all'
                ? "bg-white text-indigo-950 shadow-soft"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Semua ({dailyExams.length})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5",
              filterTab === 'pending'
                ? "bg-emerald-600 text-white shadow-soft"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Belum Dikerjakan
            {pendingCount > 0 && (
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                filterTab === 'pending' ? "bg-white text-emerald-700" : "bg-emerald-100 text-emerald-700"
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
                ? "bg-white text-indigo-950 shadow-soft"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Selesai ({completedCount})
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
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200/90 bg-white font-medium focus:outline-none focus:border-emerald-500 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* List Kartu Ulangan Harian */}
      {filteredExams.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 border-dashed shadow-soft">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">
            {dailyExams.length === 0 
              ? 'Belum Ada Ulangan Harian' 
              : 'Tidak Ada Ulangan Sesuai Filter'}
          </h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto mt-1">
            {dailyExams.length === 0
              ? 'Bapak/Ibu guru belum menerbitkan ulangan harian aktif untuk kelas Anda.'
              : 'Coba ubah tab filter atau kata kunci pencarian.'}
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
                  "p-5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 group",
                  isDone 
                    ? "bg-slate-50/70 border-slate-200/70" 
                    : "bg-white border-slate-200/85 shadow-soft hover:shadow-card hover:-translate-y-0.5 hover:border-slate-300"
                )}
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-emerald-600" /> Ulangan Harian
                    </span>

                    <span className="bg-slate-100/90 text-slate-700 border border-slate-200/60 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      {exam.subject || 'Mata Pelajaran'}
                    </span>

                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {exam.duration_minutes || exam.duration || 45} Menit
                    </span>

                    {isDone && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 font-black px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                    {exam.title}
                  </h3>
                </div>

                {isDone ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-4 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Selesai
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/exam/result/finish')}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer border border-slate-200/60"
                      title="Lihat Bukti Pengiriman"
                    >
                      Bukti Hasil
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/test/${exam.teacher_id || 'teacher'}/${exam.id}`)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    <span>Mulai</span>
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
