import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Loader2, AlertCircle, ArrowRight, Chrome, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { setTokenData } from '../lib/tokenManager';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<'guru' | 'siswa'>('guru');

  // Identitas Siswa
  const [studentData, setStudentData] = useState({
    nama: '',
    kelas: '',
    noAbsen: ''
  });

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await res.json();
        const accessToken = tokenResponse.access_token;
        
        setTokenData(accessToken, tokenResponse.expires_in);

        const session = {
          user: {
            id: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            role: 'guru',
            token: accessToken
          }
        };

        localStorage.setItem('edu_session', JSON.stringify(session));
        window.location.href = '/dashboard';
      } catch (err: any) {
        setError('Gagal mengambil profil Google.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Login Google Gagal'),
    scope: 'openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file'
  });
  const handleStudentJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData.nama || !studentData.kelas) {
      setError('Mohon isi Nama dan Kelas.');
      return;
    }
    const session = {
      user: {
        ...studentData,
        role: 'siswa'
      }
    };
    localStorage.setItem('edu_session', JSON.stringify(session));
    navigate('/exam');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-950 relative items-center justify-center p-10 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-lg">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/10 backdrop-blur-lg w-12 h-12 rounded-xl flex items-center justify-center border border-white/20">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="text-3xl font-bold text-white tracking-wide">EduTest <span className="text-blue-400 text-lg tracking-widest ml-1 opacity-80">Lite</span></span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Ujian Digital <span className="text-blue-400">Offline-First</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Platform ujian modern berbasis Google Workspace. Aman, cepat, dan bekerja tanpa internet stabil.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 w-full lg:w-1/2 flex flex-col justify-center p-5 sm:p-10 bg-slate-50/50">
        <motion.div 
          initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-indigo-950 tracking-tight">Selamat Datang, Guru</h2>
            <p className="text-slate-500 mt-2 font-medium">Masuk untuk mengelola ujian, siswa, dan melihat laporan hasil.</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5 text-red-600 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </motion.div>
          )}

          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-700 text-sm">
              Guru masuk menggunakan akun Google untuk mengakses & menyimpan data ujian di Google Drive.
            </div>
            <button
              onClick={() => googleLogin()}
              disabled={loading}
              className="w-full bg-indigo-950 text-white py-4 rounded-xl font-bold hover:bg-indigo-900 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-950/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Chrome className="w-5 h-5" />
                  Masuk dengan Google
                </>
              )}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center flex flex-col gap-4">
            <Link 
              to="/scan-qr"
              className="inline-flex items-center justify-center gap-2 bg-indigo-50 text-indigo-950 px-6 py-3.5 rounded-2xl font-black text-xs border border-indigo-100 hover:bg-indigo-100/70 transition-all active:scale-[0.98]"
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              Pindai QR Hasil Ujian (Tanpa Login)
            </Link>
            <p className="text-xs text-slate-400 font-medium">
              Siswa tidak perlu login di sini. <br/> Silakan gunakan link ujian yang dibagikan guru.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
