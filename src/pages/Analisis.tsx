import { useState, useEffect } from 'react';
import { 
  TrendingUp,
  Activity,
  Award,
  Users,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { cn } from '../lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

import { getCollectionData } from '../lib/db';
import { useSchool } from '../context/SchoolContext';
import SchoolSwitcher from '../components/SchoolSwitcher';

export default function Analisis() {
  const { activeSchool } = useSchool();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [resultsData, schoolStudents] = await Promise.all([
        getCollectionData('results'),
        getCollectionData('students', activeSchool?.id)
      ]);
      
      // Filter results: only include students from the active school
      const schoolStudentCodes = new Set(schoolStudents.map(s => s.code));
      const filtered = resultsData.filter(r => schoolStudentCodes.has(r.student?.code));
      
      setResults(filtered);
      setLoading(false);
    };
    fetchData();
  }, [activeSchool?.id]);

  const scores = results.map(r => r.score || 0);
  const totalParticipants = results.length;
  const avgScore = totalParticipants > 0 ? (scores.reduce((a, b) => a + b, 0) / totalParticipants).toFixed(1) : 0;
  const maxScore = totalParticipants > 0 ? Math.max(...scores) : 0;
  const passRate = totalParticipants > 0 ? (results.filter(r => (r.score || 0) >= 70).length / totalParticipants * 100).toFixed(0) : 0;

  // Chart Data
  const chartData = results.slice(-10).map((r, i) => ({
    name: (r.student?.nama || r.student?.name)?.split(' ')[0] || `Siswa ${i+1}`,
    skor: r.score || 0
  }));

  if (loading) return (
    <div className="animate-pulse space-y-10">
      <div className="h-20 bg-slate-100 rounded-3xl w-full"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-40 bg-slate-100 rounded-[2rem]"></div>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="tracking-tight">Analisis Performa</h2>
          <p className="text-slate-500 text-sm font-medium">Laporan statistik dari {totalParticipants} peserta ujian.</p>
        </div>
        <SchoolSwitcher />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Peserta', value: totalParticipants, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Rata-rata Nilai', value: avgScore, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Nilai Tertinggi', value: maxScore, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Lulus KKM (70+)', value: `${passRate}%`, icon: Target, color: 'text-rose-600', bg: 'bg-rose-50' }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col group hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(item.bg, item.color, "p-3 rounded-2xl")}><item.icon className="w-5 h-5" /></div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
            <p className="text-3xl font-black text-indigo-950 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {totalParticipants > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-indigo-950 mb-8">Tren Nilai Siswa (10 Terakhir)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSkor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dx={-10} />
                    <Tooltip 
                      contentStyle={{borderRadius: '1.25rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 700}}
                    />
                    <Area type="monotone" dataKey="skor" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorSkor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-indigo-950 mb-6 font-sans">Distribusi Nilai</h3>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { range: '0-20', count: results.filter(r => (r.score || 0) <= 20).length, color: 'bg-rose-100 text-rose-600' },
                  { range: '21-40', count: results.filter(r => (r.score || 0) > 20 && (r.score || 0) <= 40).length, color: 'bg-orange-100 text-orange-600' },
                  { range: '41-60', count: results.filter(r => (r.score || 0) > 40 && (r.score || 0) <= 60).length, color: 'bg-amber-100 text-amber-600' },
                  { range: '61-80', count: results.filter(r => (r.score || 0) > 60 && (r.score || 0) <= 80).length, color: 'bg-blue-100 text-blue-600' },
                  { range: '81-100', count: results.filter(r => (r.score || 0) > 80).length, color: 'bg-emerald-100 text-emerald-600' },
                ].map((d, i) => (
                  <div key={i} className="text-center space-y-2">
                    <div className="h-24 bg-slate-50 rounded-2xl flex flex-col items-end justify-end overflow-hidden p-1">
                       <motion.div 
                        initial={{ height: 0 }} animate={{ height: `${(d.count / totalParticipants) * 100}%` }}
                        className={cn("w-full rounded-xl min-h-[4px]", d.color.split(' ')[0])} 
                       />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{d.range}</p>
                    <p className={cn("text-xs font-black", d.color.split(' ')[1])}>{d.count} Org</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-indigo-950">Sebaran Kelulusan</h3>
                <p className="text-slate-400 text-sm font-medium">Berdasarkan KKM Sekolah (70)</p>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Lulus', value: Number(passRate) },
                        { name: 'Remedial', value: 100 - Number(passRate) }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f1f5f9" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-500">Lulus</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-200" />
                  <span className="text-xs font-bold text-slate-500">Remedial</span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-950 p-8 rounded-[2rem] shadow-xl shadow-indigo-950/20 text-white">
              <h3 className="text-base font-bold mb-6 flex items-center gap-3">
                <Award className="w-5 h-5 text-amber-400" />
                Peringkat Teratas
              </h3>
              <div className="space-y-4">
                {results
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .slice(0, 3)
                  .map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/10 border border-white/10">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-white/20">#{i + 1}</span>
                        <div>
                          <p className="text-xs font-bold truncate max-w-[120px]">{r.student?.nama || r.student?.name}</p>
                          <p className="text-[9px] text-white/50 uppercase font-bold">{r.student?.kelas}</p>
                        </div>
                      </div>
                      <span className="text-base font-black text-amber-400">{r.score}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] p-20 text-center border border-slate-100 border-dashed">
          <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <TrendingUp className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-bold text-indigo-950">Data Analisis Menunggu</h3>
          <p className="text-slate-400 mt-2 max-w-sm mx-auto font-medium text-sm">
            Tabel dan grafik statistik akan muncul secara otomatis setelah ada siswa yang mengumpulkan jawaban via GAS.
          </p>
        </div>
      )}
    </div>
  );
}
