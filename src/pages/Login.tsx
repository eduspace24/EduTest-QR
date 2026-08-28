import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  QrCode, 
  GraduationCap, 
  ShieldCheck, 
  User, 
  KeyRound, 
  Mail, 
  Eye, 
  EyeOff,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  findTeacher, 
  findStudent, 
  SUPER_ADMIN_ACCOUNT,
  GURUS_LIST,
  MURIDS_LIST 
} from '../lib/seedAccounts';

export default function Login() {
  const navigate = useNavigate();
  
  const [loginMode, setLoginMode] = useState<'guru' | 'murid'>('guru');
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
      // ==========================================
      // 1. SUPER ADMIN LOGIN
      // ==========================================
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

      // ==========================================
      // 2. GURU LOGIN (NIP / Email + pass: guru19*)
      // ==========================================
      if (loginMode === 'guru') {
        const matchedGuru = findTeacher(cleanInput);

        if (cleanPass !== 'guru19*' && cleanPass !== 'sman19bdg*') {
          throw new Error('Password Guru salah. Gunakan: guru19*');
        }

        if (matchedGuru) {
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

        // Fallback: Check Supabase Profiles Table directly
        try {
          const { data: supaGuru } = await supabase
            .from('profiles')
            .select('*')
            .or(`nip.eq.${cleanInput},email.eq.${cleanInput}`)
            .single();

          if (supaGuru) {
            const session = {
              user: {
                id: supaGuru.id,
                email: supaGuru.email,
                name: supaGuru.nama,
                nama: supaGuru.nama,
                nip: supaGuru.nip,
                role: supaGuru.role || 'guru',
                sekolah: supaGuru.sekolah || 'SMAN 19 Bandung',
                profileCompleted: true
              }
            };
            localStorage.setItem('edu_session', JSON.stringify(session));
            localStorage.setItem('edu_profile', JSON.stringify(session.user));
            window.location.href = '/dashboard';
            return;
          }
        } catch {}

        // Fallback: If valid password guru19*, create session for teacher input
        const fallbackSession = {
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
        localStorage.setItem('edu_session', JSON.stringify(fallbackSession));
        localStorage.setItem('edu_profile', JSON.stringify(fallbackSession.user));
        window.location.href = '/dashboard';
        return;
      }

      // ==========================================
      // 3. MURID LOGIN (NIS / Email + pass: murid19*)
      // ==========================================
      if (loginMode === 'murid') {
        const matchedMurid = findStudent(cleanInput);

        if (cleanPass !== 'murid19*' && cleanPass !== '123456') {
          throw new Error('Password Murid salah. Gunakan: murid19*');
        }

        if (matchedMurid) {
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

        // Fallback: Check Supabase Students Table
        try {
          const { data: supaStudent } = await supabase
            .from('students')
            .select('*')
            .eq('nisn', cleanInput)
            .single();

          if (supaStudent) {
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

        // Fallback for valid student password
        const fallbackMurid = {
          user: {
            id: crypto.randomUUID(),
            email: `${cleanInput}@sman19.sch.id`,
            nama: `Siswa (${cleanInput})`,
            name: `Siswa (${cleanInput})`,
            nisn: cleanInput,
            code: cleanInput,
            kelas: 'Umum',
            nama_kelas: 'Umum',
            role: 'murid',
            sekolah: 'SMAN 19 Bandung',
            profileCompleted: true
          }
        };
        localStorage.setItem('edu_session', JSON.stringify(fallbackMurid));
        localStorage.setItem('edu_profile', JSON.stringify(fallbackMurid.user));
        window.location.href = '/student/dashboard';
        return;
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal login. Periksa kembali data akun Anda.');
    } finally {
      setLoading(false);
    }
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
              Platform Ujian Digital <span className="text-blue-400">SMAN 19 Bandung</span>
            </h1>
            
            <p className="text-slate-300 text-base leading-relaxed font-medium">
              Sistem CBT modern berbasis Offline-First tanpa beban koneksi server. Dilengkapi enkripsi QR Code pengerjaan.
            </p>

            <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
                <h4 className="text-sm font-bold text-white">Super Admin & Guru</h4>
                <p className="text-xs text-slate-400 mt-1">Bank Soal TKA Modern, Buat Ujian & Scan Barcode.</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <User className="w-5 h-5 text-blue-400 mb-2" />
                <h4 className="text-sm font-bold text-white">Portal Murid</h4>
                <p className="text-xs text-slate-400 mt-1">Kartu Siswa Digital & CBT 100% Offline-First.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Login Area */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 bg-slate-50/50 min-h-screen">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full mx-auto"
        >
          {/* Role Mode Tabs */}
          <div className="flex bg-slate-200/80 p-1.5 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => { setLoginMode('guru'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`flex-1 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                loginMode === 'guru' ? 'bg-white text-indigo-950 shadow-md' : 'text-slate-500 hover:text-indigo-950'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Guru & Super Admin
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('murid'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`flex-1 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                loginMode === 'murid' ? 'bg-white text-indigo-950 shadow-md' : 'text-slate-500 hover:text-indigo-950'
              }`}
            >
              <User className="w-4 h-4" />
              Portal Murid
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight">
              {loginMode === 'guru' ? 'Masuk Portal Pendidik' : 'Masuk Portal Murid'}
            </h2>
            <p className="text-slate-500 mt-1 text-sm font-medium">
              {loginMode === 'guru' 
                ? 'Masukkan NIP atau Email Akun Guru / Super Admin.' 
                : 'Masukkan NIS dan Password Murid Anda.'}
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                {loginMode === 'guru' ? 'NIP / Email Akun' : 'NIS / Nomor Induk Siswa'}
              </label>
              <div className="relative">
                {loginMode === 'guru' ? (
                  <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                ) : (
                  <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                )}
                <input
                  type="text"
                  required
                  placeholder={loginMode === 'guru' ? "Contoh: 19860103... atau admin19bdg@sch.id" : "Contoh: 242510311"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
                  placeholder={loginMode === 'guru' ? "guru19* atau sman19bdg*" : "murid19*"}
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

            {/* Quick credentials hint */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-[11px] text-indigo-950 font-medium leading-relaxed space-y-1">
              {loginMode === 'guru' ? (
                <>
                  <p>👑 <strong>Super Admin:</strong> <code>admin19bdg@sch.id</code> • Pass: <code>sman19bdg*</code></p>
                  <p>👨‍🏫 <strong>Guru:</strong> <code>NIP Anda</code> • Pass: <code>guru19*</code></p>
                </>
              ) : (
                <p>🎓 <strong>Murid:</strong> <code>NIS Anda</code> • Pass: <code>murid19*</code></p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-950 text-white py-4 rounded-2xl font-bold hover:bg-indigo-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <span>Masuk ke {loginMode === 'guru' ? 'Dashboard' : 'Portal Murid'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Offline Scanner Shortcut */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
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
