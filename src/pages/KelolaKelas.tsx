import { useState, useEffect } from 'react';
import { 
  Users, 
  Trash2, 
  Plus, 
  Search,
  School,
  ChevronRight,
  Loader2,
  LayoutGrid,
  MoreVertical,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useRef } from 'react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { useAlert } from '../context/AlertContext';
import { getOrCreateRootFolder, saveJsonToDrive } from '../lib/googleDrive';
import { getCollectionData, saveCollection } from '../lib/db';
import { useSchool } from '../context/SchoolContext';

import SchoolSwitcher from '../components/SchoolSwitcher';

export default function KelolaKelas() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClassDetail, setSelectedClassDetail] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useAlert();
  const { activeSchool } = useSchool();

  useEffect(() => {
    const fetchData = async () => {
      const [clsData, stdData] = await Promise.all([
        getCollectionData('classes'),
        getCollectionData('students')
      ]);
      setClasses(clsData);
      setStudents(stdData);
      setLoading(false);
    };
    fetchData();
  }, [activeSchool?.id]);

  useEffect(() => {
    const profileStr = localStorage.getItem('edu_profile');
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      setSubjects(profile.subjects || []);
      if (profile.subjects?.length > 0) setSelectedSubject(profile.subjects[0]);
    }
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      const data = await getCollectionData('classes', activeSchool?.id);
      setClasses(data);
      setLoading(false);
    };
    fetchClasses();
  }, [activeSchool?.id]);

  const syncToDrive = async (updatedClasses: any[]) => {
    const filename = 'classes.json';
    await saveCollection('classes', updatedClasses);
    try {
      const folderId = await getOrCreateRootFolder();
      await saveJsonToDrive(folderId, filename, updatedClasses);
    } catch (err) {
      console.error('Failed to sync classes:', err);
    }
  };

  const addClass = async () => {
    if (!newClassName.trim()) return;
    setAdding(true);
    
    const newClass = {
      id: Date.now().toString(),
      name: newClassName.trim(),
      subject: selectedSubject,
      createdAt: new Date().toISOString(),
      schoolId: activeSchool?.id
    };

    const updated = [...classes, newClass];
    setClasses(updated);
    await syncToDrive(updated);
    
    setNewClassName('');
    setAdding(false);
    setIsModalOpen(false);
    showAlert({ title: 'Berhasil', message: `Kelas ${newClassName} ditambahkan.`, type: 'success' });
  };

  const deleteClass = (id: string, name: string) => {
    showAlert({
      title: 'Hapus Kelas?',
      message: `Apakah Anda yakin ingin menghapus kelas ${name}? Semua data siswa di kelas ini akan kehilangan referensi kelasnya.`,
      type: 'confirm',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        const updated = classes.filter(c => c.id !== id);
        setClasses(updated);
        await syncToDrive(updated);
        showAlert({ title: 'Terhapus', message: 'Kelas berhasil dihapus.', type: 'success' });
      }
    });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>, targetClassId: string) => {
    const file = e.target.files?.[0];
    if (!file || !targetClassId) return;

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
          classId: targetClassId, // Force to current class
          code: row.Kode || row.code || `EDU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          createdAt: new Date().toISOString(),
          schoolId: activeSchool?.id
        })).filter(s => s.name);

        if (newStudents.length === 0) {
          showAlert({ title: 'Gagal', message: 'Tidak ada data siswa yang valid ditemukan (Kolom "Nama" wajib ada).', type: 'error' });
          return;
        }

        const updated = [...students, ...newStudents];
        setStudents(updated);
        await saveCollection('students', updated);
        const fId = await getOrCreateRootFolder();
        await saveJsonToDrive(fId, 'students.json', updated);

        showAlert({ 
          title: 'Berhasil', 
          message: `${newStudents.length} siswa berhasil diimpor ke kelas ini.`, 
          type: 'success' 
        });
      } catch (err) {
        console.error('Excel import error:', err);
        showAlert({ title: 'Error', message: 'Gagal memproses file Excel.', type: 'error' });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const data = [
      { 'Nama': 'Budi Santoso', 'Kode': '12345' },
      { 'Nama': 'Siti Aminah', 'Kode': '12346' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, 'Template_Impor_Siswa.xlsx');
  };


  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-10 h-10 text-indigo-950 animate-spin" />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="tracking-tight mb-1">Kelola Kelas</h2>
          <p className="text-slate-500 text-sm font-medium">Daftar kelas yang terdaftar di unit kerja ini.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <SchoolSwitcher />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-950 text-white px-8 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl shadow-indigo-950/20 active:scale-95 transition-all w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Tambah Kelas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {classes.filter(c => !activeSchool || c.schoolId === activeSchool.id).map((cls) => (
            <motion.div
              layout key={cls.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setSelectedClassDetail(cls)}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-3 z-20">
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteClass(cls.id, cls.name); }}
                  className="p-2 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all border border-rose-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl group-hover:bg-indigo-950 group-hover:text-white transition-all duration-300">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-indigo-950 tracking-tight">{cls.name}</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">{cls.subject || 'Semua Mapel'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Data Terhubung</span>
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                  Aktif
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {classes.filter(c => !activeSchool || c.schoolId === activeSchool.id).length === 0 && (
          <div className="col-span-full py-16 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <School className="w-12 h-12 text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-400">Belum ada kelas terdaftar</h3>
            <p className="text-slate-400 text-sm">Klik tombol "Tambah Kelas" untuk memulai.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-indigo-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-white"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <LayoutGrid className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-indigo-950">Tambah Kelas Baru</h3>
                <p className="text-slate-400 text-sm font-medium">Lengkapi detail kelas di bawah ini.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Kelas</label>
                  <input 
                    type="text" placeholder="Contoh: XII IPA 1"
                    className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-indigo-950 transition-all"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mata Pelajaran</label>
                  <select 
                    className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-indigo-950 appearance-none cursor-pointer transition-all"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="" disabled>Pilih Mapel...</option>
                    {subjects.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={addClass} disabled={adding || !newClassName.trim()}
                    className="flex-[2] bg-indigo-950 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-950/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Kelas'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Detail Siswa dalam Kelas */}
      <AnimatePresence>
        {selectedClassDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedClassDetail(null)}
              className="absolute inset-0 bg-indigo-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-950 text-white p-3 rounded-2xl"><Users className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-xl font-black text-indigo-950">{selectedClassDetail.name}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase">{selectedClassDetail.subject}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedClassDetail(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                  <p className="text-[10px] font-black text-indigo-950 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Plus className="w-3 h-3" /> Tambah Siswa Baru
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" placeholder="Masukkan nama siswa..."
                      className="flex-1 px-5 py-3.5 rounded-2xl border border-white bg-white font-bold text-sm outline-none shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={async () => {
                          if (!newStudentName.trim()) return;
                          const ns = {
                            id: Date.now().toString(),
                            name: newStudentName.trim(),
                            classId: selectedClassDetail.id,
                            schoolId: activeSchool?.id,
                            code: `EDU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
                          };
                          const updated = [...students, ns];
                          setStudents(updated);
                          await saveCollection('students', updated);
                          const fId = await getOrCreateRootFolder();
                          await saveJsonToDrive(fId, 'students.json', updated);
                          setNewStudentName('');
                          showAlert({ title: 'Berhasil', message: `${ns.name} ditambahkan.`, type: 'success' });
                        }}
                        className="bg-indigo-950 text-white px-6 py-3.5 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg shadow-indigo-950/20"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/50 mt-2">
                    <p className="text-[9px] font-bold text-slate-400 italic">Atau gunakan file spreadsheet</p>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={downloadTemplate}
                        className="text-indigo-600 font-black text-[10px] uppercase tracking-wider hover:underline"
                      >
                        Unduh Template
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white text-emerald-600 border border-emerald-100 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm hover:bg-emerald-50 transition-all"
                      >
                        Import Excel
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-3 h-3" /> Daftar Siswa ({students.filter(s => s.classId === selectedClassDetail.id).length})
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {students.filter(s => s.classId === selectedClassDetail.id).map((s, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                        key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 italic">
                            {idx + 1}
                          </div>
                          <span className="font-bold text-indigo-950 text-sm">{s.name}</span>
                        </div>
                        <div className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {s.code}
                        </div>
                      </motion.div>
                    ))}

                    {students.filter(s => s.classId === selectedClassDetail.id).length === 0 && (
                      <div className="col-span-full py-8 text-center text-slate-400 font-bold text-sm">Belum ada siswa di kelas ini.</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
