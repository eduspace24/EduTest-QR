import { useState, useEffect } from 'react';
import { 
  Users, 
  Trash2, 
  Plus, 
  Search,
  Filter,
  Download,
  Upload,
  UserPlus,
  Loader2,
  Copy,
  Check,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { cn, generateStudentCode } from '../lib/utils';
import { useAlert } from '../context/AlertContext';
import { getOrCreateRootFolder, saveJsonToDrive } from '../lib/googleDrive';
import { getCollectionData, saveCollection } from '../lib/db';
import { useSchool } from '../context/SchoolContext';
import SchoolSwitcher from '../components/SchoolSwitcher';
import * as XLSX from 'xlsx';

export default function KelolaSiswa() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copyCode, setCopyCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    classId: ''
  });

  const { showAlert } = useAlert();
  const { activeSchool } = useSchool();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [studentsData, classesData] = await Promise.all([
        getCollectionData('students', activeSchool?.id),
        getCollectionData('classes', activeSchool?.id)
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      setLoading(false);
    };
    fetchData();
  }, [activeSchool?.id]);

  const syncToDrive = async (updatedStudents: any[]) => {
    const filename = 'students.json';
    await saveCollection('students', updatedStudents);
    try {
      const folderId = await getOrCreateRootFolder();
      await saveJsonToDrive(folderId, filename, updatedStudents);
    } catch (err) {
      console.error('Failed to sync students:', err);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.classId) return;

    const newStudent = {
      id: Date.now().toString(),
      name: formData.name,
      classId: formData.classId,
      code: generateStudentCode(),
      createdAt: new Date().toISOString(),
      schoolId: activeSchool?.id
    };

    const updated = [...students, newStudent];
    setStudents(updated);
    await syncToDrive(updated);

    setFormData({ name: '', classId: '' });
    setShowAddModal(false);
    showAlert({ title: 'Berhasil', message: `${newStudent.name} ditambahkan dengan kode ${newStudent.code}`, type: 'success' });
  };

  const deleteStudent = (id: string, name: string) => {
    showAlert({
      title: 'Hapus Siswa?',
      message: `Apakah Anda yakin ingin menghapus ${name}?`,
      type: 'confirm',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        const updated = students.filter(s => s.id !== id);
        setStudents(updated);
        await syncToDrive(updated);
        showAlert({ title: 'Terhapus', message: 'Data siswa berhasil dihapus.', type: 'success' });
      }
    });
  };

  const filteredStudents = students.filter(s => {
    const matchesSchool = !activeSchool || s.schoolId === activeSchool.id;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || s.classId === selectedClass;
    return matchesSchool && matchesSearch && matchesClass;
  });

  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'Tanpa Kelas';

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showAlert({ title: 'Gagal', message: 'File Excel kosong atau format tidak sesuai.', type: 'error' });
          return;
        }

        const newStudents = data.map((row: any) => ({
          id: (Date.now() + Math.random()).toString(),
          name: row.Nama || row.name || row.NAMA || '',
          classId: row.KelasID || row.classId || row.KELAS_ID || formData.classId || 'imported',
          code: row.Kode || row.code || generateStudentCode(),
          createdAt: new Date().toISOString(),
          schoolId: activeSchool?.id
        })).filter(s => s.name);

        if (newStudents.length === 0) {
          showAlert({ title: 'Gagal', message: 'Tidak ada data siswa yang valid ditemukan (Kolom "Nama" wajib ada).', type: 'error' });
          return;
        }

        const updated = [...students, ...newStudents];
        setStudents(updated);
        await syncToDrive(updated);

        showAlert({ 
          title: 'Berhasil', 
          message: `${newStudents.length} siswa berhasil diimpor dari Excel.`, 
          type: 'success' 
        });
      } catch (err) {
        console.error('Excel import error:', err);
        showAlert({ title: 'Error', message: 'Gagal memproses file Excel.', type: 'error' });
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopyCode(code);
    setTimeout(() => setCopyCode(null), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-10 h-10 text-indigo-950 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="tracking-tight mb-1">Kelola Siswa</h2>
            <p className="text-slate-500 text-sm font-medium">Manajemen data peserta didik di unit kerja ini.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="file" ref={fileInputRef} className="hidden" 
              accept=".xlsx,.xls" onChange={handleImportExcel} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border-2 border-slate-200 text-indigo-950 px-6 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all w-full sm:w-auto"
            >
              <Upload className="w-4 h-4" /> Impor Excel
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-950 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 active:scale-95 transition-all w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" /> Tambah Siswa Baru
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SchoolSwitcher className="!border-none !bg-slate-50 shadow-none hover:shadow-none !rounded-xl !py-2 !px-4" />
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative group w-full md:w-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" placeholder="Cari nama atau kode..."
                className="w-full md:w-64 pl-11 pr-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 text-xs font-bold transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-slate-100 bg-slate-50 outline-none appearance-none focus:ring-4 focus:ring-blue-500/5 text-xs font-bold text-indigo-950 cursor-pointer"
              >
                <option value="all">Semua Kelas</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Kode Unik</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredStudents.map((student) => (
                  <motion.tr 
                    layout key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <p className="font-bold text-indigo-950 text-sm">{student.name}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
                        <LayoutGrid className="w-3.5 h-3.5" />
                        {getClassName(student.classId)}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <button 
                        onClick={() => handleCopy(student.code)}
                        className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl font-mono text-xs font-bold hover:bg-blue-100 transition-all active:scale-95 group"
                      >
                        {student.code}
                        {copyCode === student.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => deleteStudent(student.id, student.name)}
                        className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-slate-400 font-bold">Tidak ada siswa ditemukan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-indigo-950/40 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-hidden"
            >
              <h3 className="text-2xl font-bold text-indigo-950 mb-8 tracking-tight">Tambah Siswa Baru</h3>
              <form onSubmit={handleAddStudent} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</label>
                  <input 
                    type="text" required
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-indigo-950"
                    placeholder="Contoh: Muhammad Adli"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Kelas Siswa</label>
                  <select 
                    required
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-indigo-950"
                    value={formData.classId}
                    onChange={(e) => setFormData({...formData, classId: e.target.value})}
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 text-slate-500 font-bold">Batal</button>
                  <button type="submit" className="flex-[2] bg-indigo-950 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-950/20">Simpan Siswa</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
