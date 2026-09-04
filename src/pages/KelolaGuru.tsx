import { useState, useEffect, useMemo, FormEvent } from 'react';
import React from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  KeyRound, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  GraduationCap, 
  BookOpen, 
  Mail, 
  ShieldCheck, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { cn, formatTeacherName } from '../lib/utils';
import { useAlert } from '../context/AlertContext';
import { GURUS_LIST } from '../lib/seedAccounts';

interface Teacher {
  id: string;
  email: string;
  nama: string;
  nip?: string;
  mata_pelajaran?: string;
  sekolah?: string;
  is_active: boolean;
  role: string;
  created_at: string;
}

export default function KelolaGuru() {
  const { showAlert } = useAlert();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    nip: '',
    email: '',
    password: '',
    mata_pelajaran: 'Matematika',
    sekolah: 'SMAN 19 Bandung'
  });

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../lib/appwrite');
      const res = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.PROFILES,
        [Query.equal('role', 'guru'), Query.limit(100)]
      );

      if (res && res.documents && res.documents.length > 0) {
        const mapped = res.documents.map(d => {
          const seedMatch = GURUS_LIST.find(g => 
            (d.nip && g.nip && g.nip.trim() === d.nip.trim()) ||
            (d.email && g.email && g.email.trim().toLowerCase() === d.email.trim().toLowerCase()) ||
            (d.nama && g.nama && g.nama.trim().toLowerCase() === d.nama.trim().toLowerCase())
          );
          const finalMapel = (d.mata_pelajaran && d.mata_pelajaran !== 'Guru Mata Pelajaran' && d.mata_pelajaran !== 'Umum')
            ? d.mata_pelajaran
            : (seedMatch?.mata_pelajaran || d.mata_pelajaran || 'Umum');

          return {
            id: d.$id,
            nama: formatTeacherName(d.nama || seedMatch?.nama || 'Guru'),
            nip: d.nip || seedMatch?.nip || '',
            email: d.email || seedMatch?.email || '',
            mata_pelajaran: finalMapel,
            sekolah: d.sekolah || seedMatch?.sekolah || 'SMAN 19 Bandung',
            is_active: d.is_active ?? true,
            created_at: d.$createdAt
          };
        });
        setTeachers(mapped);
        localStorage.setItem('nineteen_teachers_cache', JSON.stringify(mapped));
      } else {
        const fallback = GURUS_LIST.map((g, idx) => ({
          id: g.id || `guru-${idx + 1}`,
          nama: formatTeacherName(g.nama),
          nip: g.nip,
          email: g.email,
          mata_pelajaran: g.mata_pelajaran || 'Umum',
          sekolah: g.sekolah || 'SMAN 19 Bandung',
          is_active: true,
          created_at: new Date().toISOString()
        }));
        setTeachers(fallback);
        localStorage.setItem('nineteen_teachers_cache', JSON.stringify(fallback));
      }
    } catch (err: any) {
      console.warn('Appwrite profiles fetch notice, using fallback seed/cache:', err.message);
      const cached = localStorage.getItem('nineteen_teachers_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const enriched = parsed.map((t: any) => {
            const seedMatch = GURUS_LIST.find(g => 
              (t.nip && g.nip && g.nip.trim() === t.nip.trim()) ||
              (t.email && g.email && g.email.trim().toLowerCase() === t.email.trim().toLowerCase()) ||
              (t.nama && g.nama && g.nama.trim().toLowerCase() === t.nama.trim().toLowerCase())
            );
            return {
              ...t,
              nama: formatTeacherName(t.nama || seedMatch?.nama || 'Guru'),
              mata_pelajaran: (t.mata_pelajaran && t.mata_pelajaran !== 'Guru Mata Pelajaran' && t.mata_pelajaran !== 'Umum')
                ? t.mata_pelajaran
                : (seedMatch?.mata_pelajaran || t.mata_pelajaran || 'Umum')
            };
          });
          setTeachers(enriched);
        } catch {
          const fallback = GURUS_LIST.map((g, idx) => ({
            id: g.id || `guru-${idx + 1}`,
            nama: formatTeacherName(g.nama),
            nip: g.nip,
            email: g.email,
            mata_pelajaran: g.mata_pelajaran || 'Umum',
            sekolah: g.sekolah || 'SMAN 19 Bandung',
            is_active: true,
            created_at: new Date().toISOString()
          }));
          setTeachers(fallback);
        }
      } else {
        const fallback = GURUS_LIST.map((g, idx) => ({
          id: g.id || `guru-${idx + 1}`,
          nama: formatTeacherName(g.nama),
          nip: g.nip,
          email: g.email,
          mata_pelajaran: g.mata_pelajaran || 'Umum',
          sekolah: g.sekolah || 'SMAN 19 Bandung',
          is_active: true,
          created_at: new Date().toISOString()
        }));
        setTeachers(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleOpenCreate = () => {
    setEditingTeacher(null);
    setFormData({
      nama: '',
      nip: '',
      email: '',
      password: '',
      mata_pelajaran: 'Matematika',
      sekolah: 'SMA / SMK Negeri 19'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFormData({
      nama: t.nama,
      nip: t.nip || '',
      email: t.email,
      password: '',
      mata_pelajaran: t.mata_pelajaran || 'Matematika',
      sekolah: t.sekolah || 'SMA / SMK Negeri 19'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.email) {
      showAlert('Nama dan Email wajib diisi!', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, ID } = await import('../lib/appwrite');

      if (editingTeacher) {
        // Update Teacher Profile in Appwrite
        await databases.updateDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.PROFILES,
          editingTeacher.id,
          {
            nama: formatTeacherName(formData.nama),
            nip: formData.nip,
            email: formData.email,
            mata_pelajaran: formData.mata_pelajaran,
            sekolah: formData.sekolah
          }
        );
        showAlert('Data Guru berhasil diperbarui!', 'success');
      } else {
        // Create New Teacher Profile in Appwrite
        const docId = (formData.nip || formData.email).replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 36) || ID.unique();
        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.PROFILES,
          docId,
          {
            nama: formatTeacherName(formData.nama),
            nip: formData.nip || '',
            email: formData.email.trim().toLowerCase(),
            role: 'guru',
            mata_pelajaran: formData.mata_pelajaran,
            sekolah: formData.sekolah,
            password_pin: formData.password || 'guru19*',
            is_active: true
          }
        );
        showAlert('Akun Guru berhasil dibuat!', 'success');
      }

      setShowModal(false);
      fetchTeachers();
    } catch (err: any) {
      console.error(err);
      showAlert(err.message || 'Gagal menyimpan data guru', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTeacherStatus = async (teacher: Teacher) => {
    try {
      const nextStatus = !teacher.is_active;
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../lib/appwrite');
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.PROFILES,
        teacher.id,
        { is_active: nextStatus }
      );

      setTeachers(prev => prev.map(t => t.id === teacher.id ? { ...t, is_active: nextStatus } : t));
      showAlert(`Akun ${teacher.nama} berhasil ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    } catch (err: any) {
      showAlert(err.message || 'Gagal mengubah status', 'error');
    }
  };

  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach(t => {
      if (t.mata_pelajaran) {
        t.mata_pelajaran.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed && trimmed !== 'Guru Mata Pelajaran' && trimmed !== 'Umum') {
            set.add(trimmed);
          }
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [teachers]);

  const filteredTeachers = teachers.filter(t => {
    const matchSearch = t.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.nip && t.nip.includes(searchTerm)) ||
      (t.mata_pelajaran && t.mata_pelajaran.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchSubject = selectedSubject 
      ? (t.mata_pelajaran && t.mata_pelajaran.toLowerCase().includes(selectedSubject.toLowerCase())) 
      : true;
    return matchSearch && matchSubject;
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Super Admin Panel
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1">Kelola Akun Guru</h1>
          <p className="text-slate-500 text-sm font-medium">Buat dan kelola akun guru yang berwenang membuat ujian di Nineteen Exam.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTeachers}
            disabled={loading}
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
            title="Muat Ulang"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="bg-indigo-950 text-white px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Tambah Guru Baru
          </button>
        </div>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-950 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Guru</p>
            <h3 className="text-2xl font-black text-indigo-950 mt-0.5">{teachers.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Guru Aktif</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
              {teachers.filter(t => t.is_active).length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Mata Pelajaran</p>
            <h3 className="text-2xl font-black text-purple-950 mt-0.5">
              {availableSubjects.length} Mapel
            </h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama guru, email, NIP, atau mata pelajaran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:border-indigo-950 transition-all"
          />
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-4 py-3.5 bg-white rounded-2xl border border-slate-200 outline-none text-slate-700 font-bold text-sm focus:border-indigo-950 transition-all max-w-xs"
        >
          <option value="">Semua Mata Pelajaran ({availableSubjects.length})</option>
          {availableSubjects.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Teachers Table Card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-950 animate-spin" />
            <p className="text-slate-400 text-sm font-bold">Memuat daftar guru...</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-indigo-950">Belum Ada Akun Guru</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1 font-medium">
              Klik tombol "Tambah Guru Baru" di atas untuk membuat akun guru pertama.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Guru & NIP</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Email Akun</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Mata Pelajaran</th>
                  <th className="px-6 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-950 font-black flex items-center justify-center text-sm shrink-0">
                          {formatTeacherName(teacher.nama).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-indigo-950 text-sm leading-tight">{formatTeacherName(teacher.nama)}</p>
                          <p className="text-xs text-slate-400 font-medium">NIP: {teacher.nip || '-'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{teacher.email}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                        {(teacher.mata_pelajaran || 'Umum')
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean)
                          .map((subj, idx) => (
                            <span
                              key={idx}
                              className="bg-purple-50 text-purple-900 border border-purple-200/80 text-xs font-bold px-2.5 py-1 rounded-xl shadow-xs"
                            >
                              {subj}
                            </span>
                          ))}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleTeacherStatus(teacher)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-all",
                          teacher.is_active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                        )}
                      >
                        {teacher.is_active ? '● Aktif' : '○ Nonaktif'}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(teacher)}
                          className="p-2 text-slate-400 hover:text-indigo-950 hover:bg-slate-100 rounded-xl transition-all"
                          title="Edit Guru"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-950 rounded-2xl">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-indigo-950">
                      {editingTeacher ? 'Edit Data Guru' : 'Tambah Guru Baru'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {editingTeacher ? 'Perbarui informasi profil guru.' : 'Buatkan akun login guru untuk Nineteen Exam.'}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dra. Sri Wahyuni, M.Pd"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                      NIP / Kode Guru
                    </label>
                    <input
                      type="text"
                      placeholder="19800512..."
                      value={formData.nip}
                      onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Mata Pelajaran * (Bisa &gt;1, pisahkan koma)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Seni Rupa, PKWU, Informatika"
                      value={formData.mata_pelajaran}
                      onChange={(e) => setFormData({ ...formData, mata_pelajaran: e.target.value })}
                      list="teacher-subjects-datalist"
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 transition-all"
                    />
                    <datalist id="teacher-subjects-datalist">
                      {availableSubjects.map(s => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Email Akun Guru *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="guru@sekolah.sch.id"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 transition-all"
                  />
                </div>

                {!editingTeacher && (
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Password Akun * (Minimal 6 karakter)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Ketik password..."
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 pr-12 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-950 p-1"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-3.5 bg-indigo-950 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {editingTeacher ? 'Simpan Perubahan' : 'Buat Akun Guru'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
