import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, AlertCircle, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

export default function StudentJoin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [studentData, setStudentData] = useState({
    nama: '',
    kelas: '',
    noAbsen: ''
  });

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData.nama || !studentData.kelas) {
      setError('Nama dan Kelas wajib diisi.');
      return;
    }
    
    setLoading(true);
    
    // Save to session
    const session = {
      user: {
        ...studentData,
        role: 'siswa'
      }
    };
    localStorage.setItem('edu_session', JSON.stringify(session));
    
    // In this new architecture, students usually click a specific link.
    // If they come here directly, we might ask for an Exam ID.
    const examCode = prompt('Masukkan ID Ujian (dari link Guru):');
    if (examCode) {
      navigate(`/test/teacher/${examCode}`);
    } else {
      setError('ID Ujian diperlukan. Silakan gunakan link yang dibagikan Guru.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-10 relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-indigo-950 w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-indigo-950 tracking-tight">EduTest <span className="text-blue-600">Lite</span> <span className="text-blue-400 text-xl">Siswa</span></h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Lengkapi identitas untuk memulai ujian.</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Nama Lengkap</label>
            <input 
              type="text" required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
              placeholder="Budi Santoso"
              value={studentData.nama}
              onChange={(e) => setStudentData({...studentData, nama: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Kelas</label>
              <input 
                type="text" required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                placeholder="XII IPS 1"
                value={studentData.kelas}
                onChange={(e) => setStudentData({...studentData, kelas: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">No. Absen</label>
              <input 
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                placeholder="01"
                value={studentData.noAbsen}
                onChange={(e) => setStudentData({...studentData, noAbsen: e.target.value})}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full bg-indigo-950 text-white py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 transition-all hover:bg-indigo-900 active:scale-95 shadow-lg shadow-slate-200"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Masuk ke Ruang Ujian <ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button onClick={() => navigate('/login')} className="text-slate-400 text-sm font-bold hover:text-indigo-950">Anda Guru? Masuk di sini</button>
        </div>
      </motion.div>
    </div>
  );
}
