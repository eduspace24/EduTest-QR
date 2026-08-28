import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Loader2, 
  AlertCircle, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  Chrome, 
  QrCode, 
  ShieldCheck, 
  User,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { supabase } from '../lib/supabase';
import { setTokenData } from '../lib/tokenManager';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState<'guru' | 'siswa'>('guru');

  // Teacher / Admin Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Student Exam Join Form
  const [studentNISN, setStudentNISN] = useState('');
  const [studentToken, setStudentToken] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan Password wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Cek default Super Admin Login Shortcut (untuk kemudahan setup pertama)
      const cleanEmail = email.trim().toLowerCase();
      if (
        (cleanEmail === 'admin@nineteen.sch.id' || cleanEmail === 'superadmin@sekolah.sch.id' || cleanEmail === 'admin@sekolah.sch.id') && 
        password === 'admin123'
      ) {
        const adminSession = {
          user: {
            id: 'superadmin-01',
            email: cleanEmail,
            name: 'Super Administrator',
            role: 'superadmin',
            profileCompleted: true,
            sekolah: 'SMA / SMK Negeri 19'
          }
        };
        localStorage.setItem('edu_session', JSON.stringify(adminSession));
        localStorage.setItem('edu_profile', JSON.stringify(adminSession.user));
        window.location.href = '/dashboard';
        return;
      }

      // 2. Cek Login via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (authError) {
        // Fallback: Check local or profiles table directly if user created manually
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .single();

        if (profileData && profileData.is_active !== false) {
          const session = {
            user: {
              id: profileData.id,
              email: profileData.email,
              name: profileData.nama,
              role: profileData.role || 'guru',
              nip: profileData.nip,
              mata_pelajaran: profileData.mata_pelajaran,
              sekolah: profileData.sekolah || 'SMA / SMK Negeri 19',
              profileCompleted: true
            }
          };
          localStorage.setItem('edu_session', JSON.stringify(session));
          localStorage.setItem('edu_profile', JSON.stringify(session.user));
          window.location.href = '/dashboard';
          return;
        }

        throw new Error(authError.message === 'Invalid login credentials' ? 'Email atau Password salah.' : authError.message);
      }

      if (authData.user) {
        // Ambil data detail profil guru
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        const role = profile?.role || (cleanEmail.includes('admin') ? 'superadmin' : 'guru');
        const session = {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            name: profile?.nama || authData.user.user_metadata?.nama || authData.user.email?.split('@')[0],
            role: role,
            nip: profile?.nip,
            mata_pelajaran: profile?.mata_pelajaran,
            sekolah: profile?.sekolah || 'SMA / SMK Negeri 19',
            profileCompleted: true
          }
        };

        localStorage.setItem('edu_session', JSON.stringify(session));
        localStorage.setItem('edu_profile', JSON.stringify(session.user));
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal login. Periksa kembali email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

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

        const isSuper = profile.email.includes('admin');
        const session = {
          user: {
            id: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            role: isSuper ? 'superadmin' : 'guru',
            profileCompleted: true,
            token: accessToken
          }
        };

        localStorage.setItem('edu_session', JSON.stringify(session));
        localStorage.setItem('edu_profile', JSON.stringify(session.user));
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
    if (!studentNISN) {
      setError('Mohon masukkan NISN / Nomor Peserta.');
      return;
    }
    navigate(`/exam?nisn=${encodeURIComponent(studentNISN)}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
      {/* Left Promotional Banner */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-950 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-lg space-y-6">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/10 backdrop-blur-lg w-12 h-12 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="text-3xl font-black text-white tracking-tight">
                Nineteen <span className="text-blue-400">Exam</span>
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
              Platform Ujian Digital <span className="text-blue-400">Hybrid & Offline-First</span>
            </h1>
            
            <p className="text-slate-300 text-base leading-relaxed font-medium">
              Sistem CBT modern untuk sekolah. Bebas gangguan jaringan dengan teknologi pengerjaan offline dan pemindaian cepat QR Code.
            </p>

            <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
                <h4 className="text-sm font-bold text-white">Super Admin & Guru</h4>
                <p className="text-xs text-slate-400 mt-1">Manajemen akun guru terpusat & Bank Soal TKA Modern.</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <QrCode className="w-5 h-5 text-blue-400 mb-2" />
                <h4 className="text-sm font-bold text-white">Offline Ready</h4>
                <p className="text-xs text-slate-400 mt-1">Siswa ujian tanpa internet & submit instan via barcode.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Login Container */}
      <div className="flex-1 w-full lg:w-1/2 flex flex-col justify-center p-6 sm:p-12 bg-slate-50/50">
        <motion.div 
          initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md mx-auto"
        >
          {/* Mode Switcher */}
          <div className="flex bg-slate-200/70 p-1.5 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => { setLoginMode('guru'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                loginMode === 'guru' ? 'bg-white text-indigo-950 shadow-md' : 'text-slate-500 hover:text-indigo-950'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Guru & Super Admin
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('siswa'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                loginMode === 'siswa' ? 'bg-white text-indigo-950 shadow-md' : 'text-slate-500 hover:text-indigo-950'
              }`}
            >
              <User className="w-4 h-4" />
              Portal Siswa
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight">
              {loginMode === 'guru' ? 'Masuk ke Portal Pendidik' : 'Masuk Ujian Siswa'}
            </h2>
            <p className="text-slate-500 mt-1 text-sm font-medium">
              {loginMode === 'guru' 
                ? 'Gunakan akun yang telah didaftarkan oleh Super Admin.' 
                : 'Ketikkan NISN atau gunakan tautan ujian yang diberikan guru.'}
            </p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {loginMode === 'guru' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Email Akun
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="nama.guru@sekolah.sch.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:border-indigo-950 focus:ring-4 focus:ring-indigo-950/5 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-white rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:border-indigo-950 focus:ring-4 focus:ring-indigo-950/5 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-950"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-[11px] text-indigo-950 font-medium leading-relaxed">
                💡 <strong>Demo Super Admin:</strong> <code>admin@nineteen.sch.id</code> (Password: <code>admin123</code>)
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-950 text-white py-4 rounded-2xl font-bold hover:bg-indigo-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 text-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-50 px-3 text-slate-400 font-bold">Atau</span></div>
              </div>

              <button
                type="button"
                onClick={() => googleLogin()}
                disabled={loading}
                className="w-full bg-white border-2 border-slate-200 text-slate-700 py-3.5 rounded-2xl font-bold hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm shadow-sm"
              >
                <Chrome className="w-5 h-5 text-indigo-950" />
                Masuk dengan Akun Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleStudentJoin} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                  NISN / Nomor Induk Siswa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ketik 10 digit NISN..."
                  value={studentNISN}
                  onChange={(e) => setStudentNISN(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:border-indigo-950 focus:ring-4 focus:ring-indigo-950/5 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-950 text-white py-4 rounded-2xl font-bold hover:bg-indigo-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 text-sm"
              >
                <span>Masuk ke Ruang Ujian</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Offline Scanner Shortcut */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center flex flex-col gap-3">
            <Link 
              to="/scan-qr"
              className="inline-flex items-center justify-center gap-2 bg-white text-indigo-950 px-6 py-3.5 rounded-2xl font-black text-xs border border-slate-200 hover:bg-slate-100 transition-all active:scale-[0.98] shadow-sm"
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              Buka Scanner QR Pengawas (Tanpa Login)
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
