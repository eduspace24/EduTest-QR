import { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  ArrowUpRight,
  TrendingUp,
  Zap,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Student dashboard is mostly informational in offline-first mode
    setLoading(false);
  }, []);

  if (loading) return (
    <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl"></div>)}
      </div>
      <div className="h-96 bg-slate-100 rounded-3xl"></div>
    </div>
  );

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-indigo-950 tracking-tight">Halo, Selamat Belajar!</h2>
          <p className="text-slate-500 mt-1 font-medium">Gunakan link ujian yang diberikan guru untuk memulai.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 sm:p-12 text-center">
        <div className="bg-indigo-50 text-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-indigo-950 mb-2">Cara Mengikuti Ujian</h3>
        <p className="text-slate-500 text-sm font-medium max-w-md mx-auto mb-8">
          Guru akan membagikan link ujian kepada Anda. Klik link tersebut, masukkan kode unik siswa Anda, dan mulai mengerjakan ujian.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
          {[
            { step: '1', label: 'Klik link dari Guru' },
            { step: '2', label: 'Masukkan kode unik' },
            { step: '3', label: 'Kerjakan & Submit' },
          ].map((item) => (
            <div key={item.step} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="bg-indigo-950 text-white w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 font-black text-sm">
                {item.step}
              </div>
              <p className="text-xs font-bold text-slate-600">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
