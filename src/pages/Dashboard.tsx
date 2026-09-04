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
import { GURUS_LIST, MURIDS_LIST } from '../lib/seedAccounts';
import { supabase } from '../lib/supabase';
import SchoolSwitcher from '../components/SchoolSwitcher';

export default function Dashboard() {
  const { activeSchool } = useSchool();
  const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
  const userRole = session?.user?.role || 'guru';
  const isSuperAdmin = userRole === 'superadmin';
  const userName = session?.user?.name || session?.user?.nama || 'Pengguna';

  const [stats, setStats] = useState({
    totalExams: 0,
    totalQuestions: 0,
    totalParticipants: MURIDS_LIST.length, // 1252 murid default
    totalTeachers: GURUS_LIST.length,     // 51 guru default
    avgScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [bankSoal, students, exams, results] = await Promise.all([
          getCollectionData('bank_soal'),
          getCollectionData('students', activeSchool?.id),
          getCollectionData('exams_list'),
          getCollectionData('results')
        ]);

        const avg = results.length > 0 
          ? Math.round(results.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / results.length)
          : 0;

        // Check Appwrite count if available
        let studentCount = students.length > 0 ? students.length : MURIDS_LIST.length;
        try {
          const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../lib/appwrite');
          const countRes = await databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.STUDENTS, [Query.limit(1)]);
          if (countRes && countRes.total > 0) {
            studentCount = countRes.total;
          }
        } catch {}

        setStats({
          totalExams: exams.length,
          totalQuestions: bankSoal.length,
          totalParticipants: studentCount,
          totalTeachers: GURUS_LIST.length || 51,
          avgScore: avg
        });
      } catch (e) {
        setStats({
          totalExams: 0,
          totalQuestions: 0,
          totalParticipants: MURIDS_LIST.length,
          totalTeachers: GURUS_LIST.length,
          avgScore: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [activeSchool?.id]);

  const statCards = isSuperAdmin ? [
    { label: 'Total Guru', value: stats.totalTeachers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-200' },
    { label: 'Total Murid', value: stats.totalParticipants, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-200' },
    { label: 'Bank Soal Sekolah', value: stats.totalQuestions, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-200' },
    { label: 'Total Sesi Ujian', value: stats.totalExams, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-200' },
  ] : [
    { label: 'Ujian Diterbitkan', value: stats.totalExams, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-200' },
    { label: 'Bank Soal Saya', value: stats.totalQuestions, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-200' },
    { label: 'Murid Mengikuti', value: stats.totalParticipants, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-200' },
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
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              {isSuperAdmin ? 'Super Administrator' : 'Guru Pengampu'}
            </span>
          </div>
          <h2 className="tracking-tight text-2xl sm:text-3xl font-black text-indigo-950 mt-1">
            Selamat Datang, {userName}!
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {isSuperAdmin 
              ? 'Pusat kendali master data, akun guru, dan jadwal ujian sekolah.' 
              : 'Kelola materi ujian dan pindai QR barcode hasil pengerjaan murid.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin ? (
            <>
              <Link 
                to="/kelola-guru"
                className="bg-indigo-950 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg text-xs active:scale-95 transition-all"
              >
                <Users className="w-4 h-4" />
                Kelola Akun Guru
              </Link>
              <Link 
                to="/kelola-siswa"
                className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg text-xs active:scale-95 transition-all"
              >
                <GraduationCap className="w-4 h-4" />
                Kelola Murid & Kartu
              </Link>
            </>
          ) : (
            <>
              <Link 
                to="/scan-qr"
                className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg text-xs active:scale-95 transition-all"
              >
                <Zap className="w-4 h-4" />
                Pindai QR Murid
              </Link>
              <Link 
                to="/buat-ujian"
                className="bg-indigo-950 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg text-xs active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                Buat Ujian Baru
              </Link>
            </>
          )}
        </div>
      </div>

      <motion.div variants={slideUp} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-8 sm:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[300px]">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-32 h-32 text-indigo-950" />
          </div>
          <div className="relative z-10">
            <div className="bg-indigo-50 text-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-indigo-950 mb-2">
              {isSuperAdmin ? 'Pusat Kendali Ujian' : 'Mulai Sesi Ujian'}
            </h3>
            <p className="text-slate-500 text-sm font-medium max-w-xs mb-6 px-4">
              {isSuperAdmin 
                ? 'Kelola akun guru, cetak kartu ujian murid, dan pantau hasil ujian terpusat.' 
                : 'Buat sesi ujian baru dan bagikan token unik kepada murid sekarang.'}
            </p>
            <Link 
              to={isSuperAdmin ? "/kelola-guru" : "/buat-ujian"} 
              className="bg-indigo-950 text-white px-8 py-3 rounded-xl font-bold inline-block shadow-md shadow-indigo-950/20 hover:-translate-y-0.5 transition-all text-sm"
            >
              {isSuperAdmin ? 'Kelola Guru' : 'Buat Sekarang'}
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 p-6">
          <h3 className="text-base font-black text-indigo-950 mb-6">Pintasan Cepat</h3>
          <div className="space-y-2">
            {(isSuperAdmin ? [
              { label: 'Kelola Akun Guru', desc: 'Atur akun pendidik', icon: Users, color: 'text-indigo-600', to: '/kelola-guru' },
              { label: 'Kelola Kelas', desc: 'Atur grup murid', icon: GraduationCap, color: 'text-purple-600', to: '/kelola-kelas' },
              { label: 'Kelola Akun Murid', desc: 'Cetak kartu ujian', icon: FileText, color: 'text-amber-600', to: '/kelola-siswa' },
            ] : [
              { label: 'Bank Soal', desc: 'Kelola pertanyaan', icon: BookOpen, color: 'text-blue-600', to: '/bank-soal' },
              { label: 'Buat Ujian Baru', desc: 'Rancang ujian baru', icon: Plus, color: 'text-purple-600', to: '/buat-ujian' },
              { label: 'Daftar Ujian', desc: 'Laporan & status aktif', icon: FileText, color: 'text-amber-600', to: '/daftar-ujian' },
            ]).map((item, idx) => {
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
