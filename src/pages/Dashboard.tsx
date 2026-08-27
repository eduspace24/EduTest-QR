import { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Clock, 
  ArrowUpRight,
  Plus,
  TrendingUp,
  Zap,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { slideUp } from '../lib/animations';
import { Skeleton } from '../components/Skeleton';
import { getCollectionData } from '../lib/db';
import { useSchool } from '../context/SchoolContext';

import SchoolSwitcher from '../components/SchoolSwitcher';

export default function Dashboard() {
  const { activeSchool } = useSchool();
  const [stats, setStats] = useState({
    totalExams: 0,
    totalQuestions: 0,
    totalParticipants: 0,
    avgScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const [bankSoal, students, exams, results] = await Promise.all([
        getCollectionData('bank_soal'), // Universal
        getCollectionData('students', activeSchool?.id), // School-specific
        getCollectionData('exams_list'), // Universal
        getCollectionData('results') // Universal
      ]);

      // Filter results for current school
      const schoolStudentCodes = new Set(students.map(s => s.code));
      const schoolResults = results.filter(r => schoolStudentCodes.has(r.student?.code));
      
      const avg = schoolResults.length > 0 
        ? Math.round(schoolResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / schoolResults.length)
        : 0;

      setStats({
        totalExams: exams.length,
        totalQuestions: bankSoal.length,
        totalParticipants: students.length,
        avgScore: avg
      });
      setLoading(false);
    };

    fetchStats();
  }, [activeSchool?.id]);

  const statCards = [
    { label: 'Total Ujian', value: stats.totalExams, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-200' },
    { label: 'Bank Soal', value: stats.totalQuestions, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-200' },
    { label: 'Total Peserta', value: stats.totalParticipants, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-200' },
    { label: 'Rata-rata Nilai', value: `${stats.avgScore}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-200' },
  ];

  if (loading) return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i}><Skeleton className="h-40 rounded-[2.5rem]" /></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Skeleton className="h-[400px] rounded-[3rem]" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[400px] rounded-[3rem]" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="tracking-tight mb-1">Ringkasan Dashboard</h2>
          <p className="text-slate-500 text-sm font-medium">Pantau performa ujian dan bank soal Anda.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <SchoolSwitcher />
          <Link 
            to="/buat-ujian"
            className="bg-indigo-950 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 active:scale-95 transition-all text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Ujian Baru
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              key={idx}
              variants={slideUp}
              initial="initial" animate="animate"
              transition={{ delay: idx * 0.1 }}
              className="group bg-white p-5 rounded-2xl border border-slate-100 hover:border-indigo-950/10 hover:shadow-xl hover:shadow-indigo-950/5 transition-all text-left"
            >
              <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${stat.border} group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight">{stat.value}</h3>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-8 sm:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[300px]">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-32 h-32 text-indigo-950" />
          </div>
          <div className="relative z-10">
            <div className="bg-indigo-50 text-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-indigo-950 mb-2">Mulai Sesi Ujian</h3>
            <p className="text-slate-500 text-sm font-medium max-w-xs mb-6 px-4">Buat sesi ujian baru dan bagikan kode unik kepada siswa sekarang.</p>
            <Link to="/buat-ujian" className="bg-indigo-950 text-white px-8 py-3 rounded-xl font-bold inline-block shadow-md shadow-indigo-950/20 hover:-translate-y-0.5 transition-all text-sm">
              Buat Sekarang
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 p-6">
          <h3 className="text-base font-black text-indigo-950 mb-6">Pintasan Cepat</h3>
          <div className="space-y-2">
            {[
              { label: 'Bank Soal', desc: 'Kelola pertanyaan', icon: BookOpen, color: 'text-blue-600', to: '/bank-soal' },
              { label: 'Kelola Kelas', desc: 'Atur grup siswa', icon: GraduationCap, color: 'text-purple-600', to: '/kelola-kelas' },
              { label: 'Daftar Ujian', desc: 'Laporan aktif', icon: FileText, color: 'text-amber-600', to: '/daftar-ujian' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link key={idx} to={item.to} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
                  <div className={`${item.color} bg-slate-50 p-2.5 rounded-lg group-hover:bg-white transition-colors`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-bold text-indigo-950 text-sm">{item.label}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">{item.desc}</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-200 group-hover:text-indigo-950 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
