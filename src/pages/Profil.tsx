import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail,
  Camera,
  Loader2,
  Trash2,
  LogOut,
  Building2,
  BookOpen,
  Plus,
  X,
  CheckCircle,
  GraduationCap,
  ShieldCheck,
  Award,
  Hash,
  Layers,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatPersonName, formatStudentName } from '../lib/utils';
import { useSchool } from '../context/SchoolContext';
import { useAlert } from '../context/AlertContext';
import { getCollectionData, saveCollection } from '../lib/db';

export default function Profil() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showAlert } = useAlert();
  const { refreshSchools } = useSchool();

  const [session, setSession] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    nip: '',
    nisn: '',
    kelas: '',
    nomor_absen: '',
    sekolah: 'SMAN 19 Bandung',
    subjects: [] as string[]
  });

  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const saved = localStorage.getItem('edu_session');
        if (!saved) {
          navigate('/login');
          return;
        }

        const data = JSON.parse(saved);
        setSession(data);
        const user = data.user || {};
        const role = user.role || 'guru';

        let name = user.name || user.nama || '';
        let email = user.email || '';
        let nip = user.nip || '';
        let nisn = user.nisn || user.code || '';
        let kelas = user.nama_kelas || user.kelas || '';
        let nomor_absen = user.nomor_absen || '';
        let sekolah = user.sekolah || (user.schools && user.schools[0]) || 'SMAN 19 Bandung';
        let subjects: string[] = user.subjects || [];

        if (user.mata_pelajaran && !subjects.includes(user.mata_pelajaran)) {
          subjects = [user.mata_pelajaran, ...subjects];
        } else if (user.subject && !subjects.includes(user.subject)) {
          subjects = [user.subject, ...subjects];
        }

        // Deep lookup for teachers from seed/IndexedDB if missing details
        if (role === 'guru') {
          name = formatPersonName(name, 'guru');
          let teachers = await getCollectionData('teachers');
          if (!teachers || teachers.length === 0) {
            try {
              const res = await fetch('/seed_gurus.json');
              if (res.ok) teachers = await res.json();
            } catch {}
          }

          if (teachers && teachers.length > 0) {
            const cleanInput = (email || nip || '').toLowerCase().trim();
            const found = teachers.find((t: any) => 
              (t.email && t.email.toLowerCase() === cleanInput) ||
              (t.nip && t.nip === cleanInput) ||
              (t.nama && t.nama.toLowerCase().includes(name.toLowerCase()))
            );

            if (found) {
              if (!nip && found.nip) nip = found.nip;
              if (found.mata_pelajaran && subjects.length === 0) {
                subjects = [found.mata_pelajaran];
              }
              if (found.nama && !name) name = formatPersonName(found.nama, 'guru');
            }
          }
        }

        // Deep lookup for students from seed/IndexedDB if missing details
        if (role === 'murid' || role === 'siswa') {
          name = formatStudentName(name);
          let students = await getCollectionData('students');
          if (!students || students.length === 0) {
            try {
              const res = await fetch('/seed_murids.json');
              if (res.ok) students = await res.json();
            } catch {}
          }

          if (students && students.length > 0) {
            const cleanInput = (nisn || email || '').toLowerCase().trim();
            const found = students.find((s: any) => 
              (s.nisn && s.nisn === cleanInput) ||
              (s.email && s.email.toLowerCase() === cleanInput) ||
              (s.nama && s.nama.toLowerCase().includes(name.toLowerCase()))
            );

            if (found) {
              if (!nisn && found.nisn) nisn = found.nisn;
              if (!kelas && found.nama_kelas) kelas = found.nama_kelas;
              if (!nomor_absen && found.nomor_absen) nomor_absen = found.nomor_absen;
              if (found.nama) name = formatStudentName(found.nama);
            }
          }
        }

        setFormData({
          name,
          email,
          nip,
          nisn,
          kelas,
          nomor_absen,
          sekolah,
          subjects: subjects.length > 0 ? subjects : (role === 'guru' ? ['Informatika'] : [])
        });
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [navigate]);

  const handleAddSubject = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();

    const trimmed = newSubject.trim();
    if (trimmed && !formData.subjects.includes(trimmed)) {
      setFormData({
        ...formData,
        subjects: [...formData.subjects, trimmed]
      });
      setNewSubject('');
    }
  };

  const handleRemoveSubject = (index: number) => {
    setFormData({
      ...formData,
      subjects: formData.subjects.filter((_, i) => i !== index)
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const userRole = session?.user?.role || 'guru';
      const formattedName = userRole === 'guru' 
        ? formatPersonName(formData.name, 'guru') 
        : formatStudentName(formData.name);

      const updatedUser = {
        ...session.user,
        name: formattedName,
        nama: formattedName,
        subjects: formData.subjects,
        mata_pelajaran: formData.subjects[0] || session?.user?.mata_pelajaran || '',
        subject: formData.subjects[0] || '',
        sekolah: formData.sekolah,
        schools: [formData.sekolah]
      };

      const updatedSession = {
        ...session,
        user: updatedUser
      };

      localStorage.setItem('edu_session', JSON.stringify(updatedSession));
      localStorage.setItem('edu_profile', JSON.stringify(updatedUser));

      // Save to IndexedDB
      try {
        await saveCollection('profile', updatedUser);
      } catch {}

      setSession(updatedSession);
      await refreshSchools();
      showAlert({ title: 'Berhasil', message: 'Profil Anda telah berhasil diperbarui.', type: 'success' });
    } catch (err) {
      showAlert({ title: 'Gagal', message: 'Gagal memperbarui profil.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = () => {
    showAlert({
      title: 'Bersihkan Cache & Reset Data Lokal?',
      message: 'Tindakan ini akan mengosongkan antrean sesi lokal dan mengembalikan sistem ke data awal. Apakah Anda yakin?',
      type: 'confirm',
      confirmText: 'Ya, Bersihkan Data',
      onConfirm: async () => {
        const keysToRemove = [
          'edu_session',
          'edu_token',
          'edu_profile',
          'edutest_exams_list',
          'edu_bank_soal',
          'active_school_id'
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));
        showAlert({ title: 'Data Terhapus', message: 'Semua sesi lokal telah dibersihkan. Mengalihkan ke login...', type: 'success' });
        setTimeout(() => window.location.href = '/login', 1000);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-950 animate-spin" />
      </div>
    );
  }

  const userRole = session?.user?.role || 'guru';
  const isSuperAdmin = userRole === 'superadmin';
  const isMurid = userRole === 'murid' || userRole === 'siswa';
  const isGuru = userRole === 'guru';

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-indigo-950">
          Profil Akun
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-0.5">
          {isSuperAdmin && 'Kelola identitas dan akun administrator sistem SMAN 19 Bandung.'}
          {isGuru && 'Identitas resmi pendidik, NIP, dan mata pelajaran yang diampu di SMAN 19 Bandung.'}
          {isMurid && 'Identitas resmi murid peserta ujian ASAT / Evaluasi SMAN 19 Bandung.'}
        </p>
      </div>

      {/* Hero Identity Card */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Cover banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 relative">
          <div className="absolute right-6 top-4 opacity-10">
            <GraduationCap className="w-28 h-28 text-white" />
          </div>
        </div>

        {/* Identity row */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white p-1.5 shadow-xl shrink-0">
                <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center font-black text-2xl text-indigo-950 overflow-hidden relative border border-slate-200">
                  {session?.user?.foto_url || session?.user?.picture ? (
                    <img 
                      src={session.user.foto_url || session.user.picture} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    formData.name.slice(0, 2).toUpperCase() || '19'
                  )}
                </div>
              </div>
              <div className="mb-1">
                <h2 className="text-xl sm:text-2xl font-black text-indigo-950 leading-tight">
                  {formData.name || 'Pengguna'}
                </h2>
                <p className="text-slate-400 text-xs font-bold mt-0.5">
                  {formData.email || '-'}
                </p>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <span className="bg-amber-100 text-amber-950 border border-amber-200 px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Super Administrator
                </span>
              )}
              {isGuru && (
                <span className="bg-indigo-100 text-indigo-950 border border-indigo-200 px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Guru Pendidik
                </span>
              )}
              {isMurid && (
                <span className="bg-emerald-100 text-emerald-950 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Murid Peserta Ujian
                </span>
              )}
            </div>
          </div>

          {/* Quick Summary Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit Sekolah</p>
              <p className="text-xs font-black text-indigo-950 mt-0.5 truncate">{formData.sekolah}</p>
            </div>

            {isGuru && (
              <>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mata Pelajaran</p>
                  <p className="text-xs font-black text-blue-600 mt-0.5 truncate">
                    {formData.subjects[0] || 'Guru Mapel'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NIP / Identitas</p>
                  <p className="text-xs font-black text-indigo-950 mt-0.5 truncate">
                    {formData.nip || 'Guru SKKBM'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Akun</p>
                  <p className="text-xs font-black text-emerald-600 mt-0.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Terverifikasi
                  </p>
                </div>
              </>
            )}

            {isMurid && (
              <>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelas / Rombel</p>
                  <p className="text-xs font-black text-blue-600 mt-0.5">
                    {formData.kelas || 'Murid SMAN 19'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NIS / NISN</p>
                  <p className="text-xs font-black text-indigo-950 mt-0.5">
                    {formData.nisn || '-'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. Absen</p>
                  <p className="text-xs font-black text-emerald-600 mt-0.5">
                    {formData.nomor_absen ? `Absen ${formData.nomor_absen}` : 'Terdaftar'}
                  </p>
                </div>
              </>
            )}

            {isSuperAdmin && (
              <>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hak Akses</p>
                  <p className="text-xs font-black text-blue-600 mt-0.5">Semua Modul</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Level Keamanan</p>
                  <p className="text-xs font-black text-purple-600 mt-0.5">Root Admin</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Sistem</p>
                  <p className="text-xs font-black text-emerald-600 mt-0.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Aktif
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Detail Form & Fields */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-indigo-950">
              Detail Informasi Akun
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              Rincian identitas dan data administratif yang terdaftar di sistem.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Field: Nama Lengkap */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" /> Nama Lengkap:
              </label>
              <input
                type="text"
                disabled={isMurid}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl border text-xs font-bold transition-all outline-none",
                  isMurid
                    ? "bg-slate-50 text-slate-600 border-slate-200 cursor-not-allowed"
                    : "bg-white text-indigo-950 border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                )}
              />
              {isGuru && (
                <p className="text-[10px] text-slate-400">Gelar akademik dapat disesuaikan (contoh: S.Pd., M.M.).</p>
              )}
            </div>

            {/* Field: Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" /> Email Akun Resmi:
              </label>
              <input
                type="email"
                disabled
                value={formData.email}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-bold text-xs cursor-not-allowed"
              />
            </div>

            {/* Field khusus Guru: NIP */}
            {isGuru && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-600" /> NIP / NUPTK:
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.nip || '-'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-bold text-xs cursor-not-allowed"
                />
              </div>
            )}

            {/* Field khusus Murid: NIS / NISN */}
            {isMurid && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-600" /> NIS / NISN:
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.nisn || '-'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-bold text-xs cursor-not-allowed"
                />
              </div>
            )}

            {/* Field khusus Murid: Kelas / Rombel */}
            {isMurid && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" /> Kelas / Rombel Asal:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    value={formData.kelas || '-'}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-950 font-black text-xs cursor-not-allowed"
                  />
                  {formData.nomor_absen && (
                    <span className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-black text-xs border border-slate-200">
                      Absen #{formData.nomor_absen}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Field: Sekolah */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> Instansi / Sekolah:
              </label>
              <input
                type="text"
                disabled
                value={formData.sekolah}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-bold text-xs cursor-not-allowed"
              />
            </div>
          </div>

          {/* Bagian Mata Pelajaran (Khusus Akun Guru) */}
          {isGuru && (
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Mata Pelajaran yang Diampu:
                </label>
                <span className="text-[10px] text-slate-400 font-bold">
                  {formData.subjects.length} Mapel Terdaftar
                </span>
              </div>

              {/* Tag Mapel yang Diampu */}
              <div className="flex flex-wrap gap-2">
                {formData.subjects.map((subj, idx) => (
                  <span 
                    key={idx}
                    className="bg-emerald-50 text-emerald-950 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2"
                  >
                    {subj}
                    {formData.subjects.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSubject(idx)}
                        className="text-emerald-700 hover:text-rose-600 transition-colors"
                        title="Hapus mapel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Tambah Mapel Lainnya */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Ketik nama mata pelajaran tambahan jika ada..."
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  onKeyDown={handleAddSubject}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-indigo-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={handleAddSubject}
                  disabled={!newSubject.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>
            </div>
          )}

          {/* Tombol Simpan (Untuk Guru & Super Admin) */}
          {(isGuru || isSuperAdmin) && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-950 hover:bg-indigo-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Simpan Perubahan Profil
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Zona Keamanan & Sesi Akun */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-4">
        <div>
          <h3 className="text-base font-black text-indigo-950">
            Zona Keamanan & Pengaturan Sesi
          </h3>
          <p className="text-slate-400 text-xs font-bold mt-0.5">
            Kelola sesi login perangkat Anda saat ini.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => showAlert({
              title: 'Keluar dari Sesi?',
              message: 'Anda akan keluar dari akun ini dan diarahkan kembali ke halaman login.',
              type: 'confirm',
              confirmText: 'Ya, Keluar',
              onConfirm: () => {
                localStorage.removeItem('edu_session');
                window.location.href = '/login';
              }
            })}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4 text-slate-500" /> Keluar dari Akun Ini
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleResetData}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4 text-rose-500" /> Bersihkan Cache Lokal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
