import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  GraduationCap, 
  KeyRound, 
  User, 
  Eye, 
  EyeOff,
  ShieldCheck,
  Zap,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  findTeacher, 
  findStudent, 
  SUPER_ADMIN_ACCOUNT 
} from '../lib/seedAccounts';

export default function Login() {
  const navigate = useNavigate();
  
  const [identifier, setIdentifier] = useState(''); // Email / NIP / NIS
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check existing session
    const session = localStorage.getItem('edu_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.user?.role === 'murid' || parsed.user?.role === 'siswa') {
          navigate('/student/dashboard');
        } else {
          navigate('/dashboard');
        }
      } catch {}
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanInput = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      // =========================================================================
      // 1. CEK SUPER ADMIN
      // =========================================================================
      if (
        (cleanInput === 'admin19bdg@sch.id' || cleanInput === 'admin19bdg' || cleanInput === 'admin@nineteen.sch.id' || cleanInput === 'admin') && 
        (cleanPass === 'sman19bdg*' || cleanPass === 'admin123')
      ) {
        const adminSession = {
          user: {
            id: SUPER_ADMIN_ACCOUNT.id,
            email: 'admin19bdg@sch.id',
            name: 'Super Administrator SMAN 19',
            role: 'superadmin',
            profileCompleted: true,
            sekolah: 'SMAN 19 Bandung'
          }
        };
        localStorage.setItem('edu_session', JSON.stringify(adminSession));
        localStorage.setItem('edu_profile', JSON.stringify(adminSession.user));
        window.location.href = '/dashboard';
        return;
      }

      // =========================================================================
      // 2. CEK GURU (NIP / Email Guru)
      // =========================================================================
      const matchedGuru = findTeacher(cleanInput);
      if (matchedGuru && (cleanPass === 'guru19*' || cleanPass === matchedGuru.password_pin)) {
        const guruSession = {
          user: {
            id: matchedGuru.id,
            email: matchedGuru.email,
            name: matchedGuru.nama,
            nama: matchedGuru.nama,
            nip: matchedGuru.nip,
            role: 'guru',
            sekolah: matchedGuru.sekolah || 'SMAN 19 Bandung',
            mata_pelajaran: matchedGuru.mata_pelajaran || 'Guru Mata Pelajaran',
            profileCompleted: true
          }
        };
        localStorage.setItem('edu_session', JSON.stringify(guruSession));
        localStorage.setItem('edu_profile', JSON.stringify(guruSession.user));
        window.location.href = '/dashboard';
        return;
      }

      // =========================================================================
      // 3. CEK MURID (NIS / Email Murid)
      // =========================================================================
      const matchedMurid = findStudent(cleanInput);
      if (matchedMurid && (cleanPass === 'murid19*' || cleanPass === matchedMurid.password_pin || cleanPass === '123456')) {
        const muridSession = {
          user: {
            id: matchedMurid.id,
            email: matchedMurid.email,
            nama: matchedMurid.nama,
            name: matchedMurid.nama,
            nisn: matchedMurid.nisn,
            code: matchedMurid.nisn,
            kelas: matchedMurid.nama_kelas,
            nama_kelas: matchedMurid.nama_kelas,
            role: 'murid',
            sekolah: 'SMAN 19 Bandung',
            profileCompleted: true
          }
        };
        localStorage.setItem('edu_session', JSON.stringify(muridSession));
        localStorage.setItem('edu_profile', JSON.stringify(muridSession.user));
        window.location.href = '/student/dashboard';
        return;
      }

      // =========================================================================
      // 4. CEK SUPABASE DATABASE (Online Fallback)
      // =========================================================================
      try {
        const { data: supaProfile } = await supabase
          .from('profiles')
          .select('*')
          .or(`nip.eq.${cleanInput},email.eq.${cleanInput}`)
          .single();

        if (supaProfile && (cleanPass === 'guru19*' || cleanPass === 'sman19bdg*')) {
          const session = {
            user: {
              id: supaProfile.id,
              email: supaProfile.email,
              name: supaProfile.nama,
              nama: supaProfile.nama,
              nip: supaProfile.nip,
              role: supaProfile.role || 'guru',
              sekolah: supaProfile.sekolah || 'SMAN 19 Bandung',
              profileCompleted: true
            }
          };
          localStorage.setItem('edu_session', JSON.stringify(session));
          localStorage.setItem('edu_profile', JSON.stringify(session.user));
          window.location.href = '/dashboard';
          return;
        }
      } catch {}

      try {
        const { data: supaStudent } = await supabase
          .from('students')
          .select('*')
          .eq('nisn', cleanInput)
          .single();

        if (supaStudent && (cleanPass === 'murid19*' || cleanPass === supaStudent.password_pin)) {
          const session = {
            user: {
              id: supaStudent.id,
              nama: supaStudent.nama,
              name: supaStudent.nama,
              nisn: supaStudent.nisn,
              code: supaStudent.nisn,
              kelas: supaStudent.nama_kelas,
              nama_kelas: supaStudent.nama_kelas,
              role: 'murid',
              sekolah: 'SMAN 19 Bandung',
              profileCompleted: true
            }
          };
          localStorage.setItem('edu_session', JSON.stringify(session));
          localStorage.setItem('edu_profile', JSON.stringify(session.user));
          window.location.href = '/student/dashboard';
          return;
        }
      } catch {}

      // =========================================================================
      // 5. AUTO-DETECT FALLBACK BY PASSWORD
      // =========================================================================
      if (cleanPass === 'guru19*') {
        const session = {
          user: {
            id: crypto.randomUUID(),
            email: cleanInput.includes('@') ? cleanInput : `${cleanInput}@sman19.sch.id`,
            name: `Guru (${cleanInput})`,
            nama: `Guru (${cleanInput})`,
            nip: cleanInput,
            role: 'guru',
            sekolah: 'SMAN 19 Bandung',
            profileCompleted: true
          }
        };
        localStorage.setItem('edu_session', JSON.stringify(session));
        localStorage.setItem('edu_profile', JSON.stringify(session.user));
        window.location.href = '/dashboard';
        return;
      }

      if (cleanPass === 'murid19*') {
        const session = {
          user: {
            id: crypto.randomUUID(),
            email: `${cleanInput}@sman19.sch.id`,
            nama: `Murid (${cleanInput})`,
            name: `Murid (${cleanInput})`,
            nisn: cleanInput,
            code: cleanInput,
            kelas: 'Umum',
            nama_kelas: 'Umum',
            role: 'murid',
            sekolah: 'SMAN 19 Bandung',
            profileCompleted: true
          }
        };
        localStorage.setItem('edu_session', JSON.stringify(session));
        localStorage.setItem('edu_profile', JSON.stringify(session.user));
        window.location.href = '/student/dashboard';
        return;
      }

      throw new Error('Username atau Password yang Anda masukkan tidak sesuai.');

    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Periksa kembali username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* ========================================================= */}
      {/* DESKTOP LEFT SIDE: HERO TITLE & TAGLINE (Hidden on Mobile) */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-950 relative items-center justify-center p-12 xl:p-16 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-blue-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-indigo-400 rounded-full blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-lg space-y-8 text-white"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-xl w-14 h-14 rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
              <GraduationCap className="text-blue-400 w-8 h-8" />
            </div>
            <div>
              <span className="text-3xl font-black tracking-tight text-white">
                Nineteen <span className="text-blue-400">Exam</span>
              </span>
              <p className="text-xs text-slate-300 font-semibold tracking-wider uppercase">
                SMAN 19 Bandung
              </p>
            </div>
          </div>

          {/* Big Title & Tagline */}
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-black leading-tight text-white">
              Platform Ujian Digital <span className="text-blue-400">CBT Modern</span> & Offline-First.
            </h1>
            <p className="text-slate-300 text-base leading-relaxed font-medium">
              Sistem evaluasi pembelajaran terintegrasi. Ujian berjalan lancar tanpa hambatan koneksi internet dengan pengumpulan hasil berbasis enkripsi QR Code.
            </p>
          </div>

          {/* Badges / Highlights */}
          <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="text-sm font-bold text-white">Aman & Terproteksi</h4>
              <p className="text-xs text-slate-400 mt-0.5">Sistem kunci layar anti-curang.</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <Zap className="w-5 h-5 text-blue-400 mb-2" />
              <h4 className="text-sm font-bold text-white">100% Offline-First</h4>
              <p className="text-xs text-slate-400 mt-0.5">Bebas gangguan sinyal sekolah.</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT SIDE (Desktop) / CENTER (Mobile): LOGIN PANEL        */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 py-12 min-h-screen bg-slate-50/70">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 space-y-6"
        >
          {/* Mobile-Only Header */}
          <div className="lg:hidden text-center space-y-1.5 pb-2 border-b border-slate-100">
            <div className="w-12 h-12 bg-indigo-950 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md mb-2">
              <GraduationCap className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-black text-indigo-950">
              Nineteen <span className="text-blue-600">Exam</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              SMAN 19 Bandung
            </p>
          </div>

          {/* Form Header */}
          <div>
            <h2 className="text-2xl font-black text-indigo-950 tracking-tight">
              Masuk ke Akun
            </h2>
            <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">
              Masukkan ID Pengguna dan Password Anda untuk melanjutkan.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 block">
                ID Pengguna (NIP / NIS / Email)
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ketik NIP, NIS, atau Email..."
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 focus:ring-4 focus:ring-indigo-950/5 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 block">
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
                  className="w-full pl-12 pr-12 py-3.5 sm:py-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 focus:ring-4 focus:ring-indigo-950/5 transition-all"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-950 text-white py-4 rounded-2xl font-bold hover:bg-indigo-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 text-sm disabled:opacity-50 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <span>Masuk ke Akun</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-[11px] text-slate-400 font-medium">
              Aplikasi Ujian CBT Terproteksi • © Nineteen Exam
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
