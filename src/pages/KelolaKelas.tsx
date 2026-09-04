import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, 
  Trash2, 
  Plus, 
  Search,
  School,
  Loader2, 
  LayoutGrid, 
  X,
  GraduationCap,
  KeyRound,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import * as XLSX from 'xlsx';
import { useAlert } from '../context/AlertContext';
import { getCollectionData, saveCollection } from '../lib/db';
import { useSchool } from '../context/SchoolContext';
import { CLASSES_LIST, MURIDS_LIST } from '../lib/seedAccounts';
import { formatStudentName } from '../lib/utils';
import SchoolSwitcher from '../components/SchoolSwitcher';

export default function KelolaKelas() {
  const [classes, setClasses] = useState<any[]>(CLASSES_LIST);
  const [students, setStudents] = useState<any[]>(MURIDS_LIST);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState('');
  const [newClassTingkat, setNewClassTingkat] = useState('X');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClassDetail, setSelectedClassDetail] = useState<any>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNis, setNewStudentNis] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [tingkatFilter, setTingkatFilter] = useState<'all' | 'X' | 'XI' | 'XII'>('all');
  const [studentSearchInModal, setStudentSearchInModal] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useAlert();
  const { activeSchool } = useSchool();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../lib/appwrite');
      const [classesRes, studentsRes] = await Promise.all([
        databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.CLASSES, [Query.limit(100)]),
        databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.STUDENTS, [Query.limit(5000)])
      ]);

      let clsList = (classesRes?.documents && classesRes.documents.length > 0)
        ? classesRes.documents
        : await getCollectionData('classes');

      if (!clsList || clsList.length === 0) {
        clsList = CLASSES_LIST;
      }

      let stdList = (studentsRes?.documents && studentsRes.documents.length > 0)
        ? studentsRes.documents
        : await getCollectionData('students');

      if (!stdList || stdList.length === 0) {
        stdList = MURIDS_LIST;
      }

      setClasses(clsList);
      setStudents(stdList);
      saveCollection('classes', clsList);
      saveCollection('students', stdList);
    } catch (err) {
      console.warn('Appwrite fetch notice, fallback to local/seed:', err);
      const [localCls, localStd] = await Promise.all([
        getCollectionData('classes'),
        getCollectionData('students')
      ]);
      setClasses(localCls && localCls.length > 0 ? localCls : CLASSES_LIST);
      setStudents(localStd && localStd.length > 0 ? localStd : MURIDS_LIST);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const syncClassesToDrive = async (updatedClasses: any[]) => {
    await saveCollection('classes', updatedClasses);
    try {
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, ID } = await import('../lib/appwrite');
      for (const c of updatedClasses) {
        const clsName = c.name || c.nama_kelas;
        const docId = String(clsName).replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 36) || ID.unique();
        try {
          await databases.createDocument(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.CLASSES,
            docId,
            {
              nama_kelas: clsName,
              tingkat: c.tingkat || (clsName.startsWith('X-') ? 'X' : (clsName.startsWith('XI-') ? 'XI' : (clsName.startsWith('XII-') ? 'XII' : 'Umum'))),
              jurusan: c.subject || c.jurusan || 'Umum'
            }
          );
        } catch {
          // Document may already exist
        }
      }
    } catch (err) {
      console.warn('Classes sync note:', err);
    }
  };

  const addClass = async () => {
    if (!newClassName.trim()) return;
    setAdding(true);
    
    const formattedName = newClassName.trim().toUpperCase();
    const newClass = {
      id: `cls_${formattedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: formattedName,
      nama_kelas: formattedName,
      tingkat: newClassTingkat,
      jurusan: 'Umum',
      subject: selectedSubject || 'Semua Mapel',
      createdAt: new Date().toISOString(),
      schoolId: activeSchool?.id || '1'
    };

    const updated = [...classes, newClass];
    setClasses(updated);
    await syncClassesToDrive(updated);
    
    setNewClassName('');
    setAdding(false);
    setIsModalOpen(false);
    showAlert({ title: 'Berhasil', message: `Kelas ${formattedName} berhasil ditambahkan.`, type: 'success' });
  };

  const deleteClass = (id: string, name: string) => {
    showAlert({
      title: 'Hapus Kelas?',
      message: `Apakah Anda yakin ingin menghapus kelas ${name}? Data murid yang berada di kelas ini tidak akan terhapus, namun tidak lagi memiliki kelas.`,
      type: 'confirm',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        try {
          const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../lib/appwrite');
          const docId = String(name).replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 36);
          await databases.deleteDocument(APPWRITE_DATABASE_ID, COLLECTIONS.CLASSES, docId);
        } catch (e) {
          console.warn('Appwrite delete class note:', e);
        }

        const updated = classes.filter(c => (c.id || c.$id) !== id && (c.name || c.nama_kelas) !== name);
        setClasses(updated);
        await saveCollection('classes', updated);
        if (selectedClassDetail && (selectedClassDetail.name || selectedClassDetail.nama_kelas) === name) {
          setSelectedClassDetail(null);
        }
        showAlert({ title: 'Terhapus', message: `Kelas ${name} berhasil dihapus.`, type: 'success' });
      }
    });
  };

  // Precompute student counts per class for O(1) instantaneous lookup (Performance Optimization)
  const studentCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of students) {
      const k = String(s.nama_kelas || s.classId || '').trim().toLowerCase();
      if (k) map[k] = (map[k] || 0) + 1;
    }
    return map;
  }, [students]);

  // Precompute counts per tingkat
  const tingkatCounts = useMemo(() => {
    let x = 0, xi = 0, xii = 0;
    for (const c of classes) {
      const name = c.name || c.nama_kelas || '';
      if (name.startsWith('X-')) x++;
      else if (name.startsWith('XI-')) xi++;
      else if (name.startsWith('XII-')) xii++;
    }
    return { all: classes.length, X: x, XI: xi, XII: xii };
  }, [classes]);

  // Grouping and filtering
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const nameA = a.name || a.nama_kelas || '';
      const nameB = b.name || b.nama_kelas || '';
      const rank = (k: string) => k.startsWith('X-') ? 1 : (k.startsWith('XI-') ? 2 : (k.startsWith('XII-') ? 3 : 4));
      const rA = rank(nameA);
      const rB = rank(nameB);
      if (rA !== rB) return rA - rB;
      return nameA.localeCompare(nameB);
    });
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return sortedClasses.filter(cls => {
      const clsName = cls.name || cls.nama_kelas || '';
      const matchesSearch = clsName.toLowerCase().includes(searchFilter.toLowerCase());
      
      let matchesTingkat = true;
      if (tingkatFilter !== 'all') {
        const tingkat = cls.tingkat || (clsName.startsWith('X-') ? 'X' : (clsName.startsWith('XI-') ? 'XI' : (clsName.startsWith('XII-') ? 'XII' : 'Umum')));
        matchesTingkat = tingkat === tingkatFilter;
      }

      return matchesSearch && matchesTingkat;
    });
  }, [sortedClasses, searchFilter, tingkatFilter]);

  // Students in selected modal class - SORTED ALPHABETICALLY BY NAME (A-Z)
  const modalClassStudents = useMemo(() => {
    if (!selectedClassDetail) return [];
    const targetName = (selectedClassDetail.name || selectedClassDetail.nama_kelas || '').trim().toLowerCase();
    if (!targetName) return [];

    const list = students.filter(s => {
      const sKelas = String(s.nama_kelas || s.classId || '').trim().toLowerCase();
      if (sKelas !== targetName) return false;

      if (!studentSearchInModal.trim()) return true;
      const sName = (s.nama || s.name || '').toLowerCase();
      const sNis = (s.nisn || s.code || '').toLowerCase();
      return sName.includes(studentSearchInModal.toLowerCase()) || sNis.includes(studentSearchInModal.toLowerCase());
    });

    return list.sort((a, b) => {
      const nameA = (a.nama || a.name || '').trim().toLowerCase();
      const nameB = (b.nama || b.name || '').trim().toLowerCase();
      return nameA.localeCompare(nameB, 'id');
    });
  }, [students, selectedClassDetail, studentSearchInModal]);

  const handleAddStudentToClass = async () => {
    if (!newStudentName.trim() || !selectedClassDetail) return;
    const targetClassName = selectedClassDetail.name || selectedClassDetail.nama_kelas;
    const genNis = newStudentNis.trim() || `NIS-${Date.now().toString().slice(-6)}`;
    const formattedName = formatStudentName(newStudentName.trim());

    const newStudentObj = {
      nama: formattedName,
      name: formattedName,
      nisn: genNis,
      nama_kelas: targetClassName,
      nomor_absen: String(modalClassStudents.length + 1),
      password_pin: 'murid19*',
      role: 'murid'
    };

    // Save to Appwrite
    try {
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../lib/appwrite');
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.STUDENTS,
        genNis,
        newStudentObj
      );
    } catch (e) {
      console.warn('Appwrite create student notice:', e);
    }

    const updated = [{ ...newStudentObj, id: genNis, name: newStudentObj.nama }, ...students];
    setStudents(updated);
    saveCollection('students', updated);
    setNewStudentName('');
    setNewStudentNis('');
    showAlert({ title: 'Berhasil', message: `${newStudentObj.nama} berhasil ditambahkan ke kelas ${targetClassName}.`, type: 'success' });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>, targetClass: any) => {
    const file = e.target.files?.[0];
    if (!file || !targetClass) return;

    const targetClassName = targetClass.name || targetClass.nama_kelas;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showAlert({ title: 'Gagal', message: 'File Excel kosong atau format tidak sesuai.', type: 'error' });
          return;
        }

        const newParsed = data.map((row: any, idx: number) => {
          const rawName = row['Nama'] || row['nama'] || row['Nama Murid'] || row['Nama Siswa'] || `Murid ${idx + 1}`;
          const sName = formatStudentName(rawName);
          const sNis = String(row['NIS'] || row['NISN'] || `NIS${Date.now()}${idx}`);
          return {
            id: sNis,
            nama: sName,
            name: sName,
            nisn: sNis,
            code: sNis,
            nama_kelas: targetClassName,
            nomor_absen: String(idx + 1),
            password_pin: String(row['PIN'] || row['Password'] || 'murid19*'),
            role: 'murid'
          };
        }).filter(s => s.nama);

        const combined = [...newParsed, ...students.filter(s => !newParsed.some(np => np.nisn === s.nisn))];
        setStudents(combined);
        saveCollection('students', combined);

        showAlert({ 
          title: 'Berhasil Impor', 
          message: `${newParsed.length} murid berhasil diimpor ke kelas ${targetClassName}.`, 
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
      { 'NIS': '252610114', 'Nama': 'GILANG DWI PRATAMA', 'No Absen': '1', 'PIN': 'murid19*' },
      { 'NIS': '252610360', 'Nama': 'RAISHA ANEIRA', 'No Absen': '2', 'PIN': 'murid19*' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Murid');
    XLSX.writeFile(wb, 'Template_Impor_Murid_Kelas.xlsx');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-indigo-950 animate-spin" />
        <p className="text-slate-400 text-sm font-bold">Memuat data kelas & murid...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-16"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Manajemen Sekolah
            </span>
            <span className="text-slate-400 text-xs font-bold">
              Total {classes.length} Kelas Terdaftar
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1">Kelola Kelas</h1>
          <p className="text-slate-500 text-sm font-medium">Daftar kelas aktif, rombongan belajar, dan rincian murid per kelas.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <SchoolSwitcher />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-950 text-white px-6 py-3.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xl shadow-indigo-950/20 active:scale-95 transition-all w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Tambah Kelas
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setTingkatFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tingkatFilter === 'all' 
                ? 'bg-white text-indigo-950 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Semua ({tingkatCounts.all})
          </button>
          <button
            onClick={() => setTingkatFilter('X')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tingkatFilter === 'X' 
                ? 'bg-white text-indigo-950 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Kelas X ({tingkatCounts.X})
          </button>
          <button
            onClick={() => setTingkatFilter('XI')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tingkatFilter === 'XI' 
                ? 'bg-white text-indigo-950 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Kelas XI ({tingkatCounts.XI})
          </button>
          <button
            onClick={() => setTingkatFilter('XII')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tingkatFilter === 'XII' 
                ? 'bg-white text-indigo-950 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Kelas XII ({tingkatCounts.XII})
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kelas (misal: X-A, XI-G, XII-H)..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-xs focus:border-indigo-950 transition-all"
          />
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredClasses.map((cls) => {
          const className = cls.name || cls.nama_kelas || 'Kelas';
          const studentCount = studentCountMap[className.trim().toLowerCase()] || 0;
          const tingkat = cls.tingkat || (className.startsWith('X-') ? 'X' : (className.startsWith('XI-') ? 'XI' : (className.startsWith('XII-') ? 'XII' : 'Umum')));

          return (
            <div
              key={cls.$id || cls.id || className}
              onClick={() => {
                setSelectedClassDetail(cls);
                setStudentSearchInModal('');
              }}
              className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer hover:border-indigo-200"
            >
              <div className="absolute top-0 right-0 p-3 z-20">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    deleteClass(cls.$id || cls.id, className); 
                  }}
                  className="p-2 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all border border-rose-100 opacity-0 group-hover:opacity-100"
                  title="Hapus Kelas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-950 flex items-center justify-center font-black text-base group-hover:bg-indigo-950 group-hover:text-white transition-all duration-300">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-indigo-950 tracking-tight">{className}</h3>
                  <p className="text-slate-400 text-[11px] font-bold">Tingkat {tingkat}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold">
                    {studentCount > 0 ? `${studentCount} Murid` : 'Belum Ada Murid'}
                  </span>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  Aktif
                </div>
              </div>
            </div>
          );
        })}

        {filteredClasses.length === 0 && (
          <div className="col-span-full py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <School className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-500">Tidak ada kelas yang cocok</h3>
            <p className="text-slate-400 text-xs mt-1">Coba sesuaikan kata kunci pencarian atau filter tingkat.</p>
          </div>
        )}
      </div>

      {/* Modal Tambah Kelas */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/70"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-slate-100"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-3">
                  <LayoutGrid className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-indigo-950">Tambah Kelas Baru</h3>
                <p className="text-slate-400 text-xs font-medium">Buat rombongan belajar baru di sekolah.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tingkat</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['X', 'XI', 'XII'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewClassTingkat(t)}
                        className={`py-3 rounded-xl font-bold text-xs border transition-all ${
                          newClassTingkat === t 
                            ? 'bg-indigo-950 text-white border-indigo-950 shadow-md' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Kelas {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Kelas</label>
                  <input 
                    type="text" 
                    placeholder={`Contoh: ${newClassTingkat}-A atau ${newClassTingkat}-1`}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-indigo-950 font-bold text-indigo-950 text-sm transition-all"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    disabled={adding || !newClassName.trim()}
                    onClick={addClass}
                    className="flex-1 py-3.5 bg-indigo-950 text-white rounded-2xl font-bold text-xs hover:bg-indigo-900 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Kelas'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Detail & Murid dalam Kelas */}
      <AnimatePresence>
        {selectedClassDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSelectedClassDetail(null)}
              className="absolute inset-0 bg-black/70"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden border border-slate-100"
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-950 text-white p-3.5 rounded-2xl shadow-md">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-indigo-950">
                      Kelas {selectedClassDetail.name || selectedClassDetail.nama_kelas}
                    </h3>
                    <p className="text-slate-400 text-xs font-bold">
                      {modalClassStudents.length} Murid Terdaftar di Kelas Ini
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedClassDetail(null)} 
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                {/* Form Tambah Murid Cepat ke Kelas Ini */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-indigo-600" /> Tambah Murid ke Kelas Ini
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={downloadTemplate}
                        className="text-indigo-600 font-bold text-[11px] hover:underline flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Unduh Template
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white border border-slate-200 text-emerald-700 px-3 py-1 rounded-xl text-[11px] font-bold shadow-sm hover:bg-emerald-50 transition-all"
                      >
                        Impor Excel
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={(e) => handleImportExcel(e, selectedClassDetail)} 
                        accept=".xlsx, .xls, .csv" 
                        className="hidden" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input 
                      type="text" 
                      placeholder="Nama Lengkap Murid..."
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs outline-none focus:border-indigo-950 transition-all"
                      value={newStudentName} 
                      onChange={(e) => setNewStudentName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="NIS / NISN (Opsional)..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs outline-none focus:border-indigo-950 transition-all"
                        value={newStudentNis} 
                        onChange={(e) => setNewStudentNis(e.target.value)}
                      />
                      <button 
                        onClick={handleAddStudentToClass}
                        disabled={!newStudentName.trim()}
                        className="bg-indigo-950 text-white px-5 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all shadow-md disabled:opacity-50"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Search Murid dalam Modal */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Daftar Murid ({modalClassStudents.length})
                    </p>
                    <div className="relative w-48">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Cari murid..."
                        value={studentSearchInModal}
                        onChange={(e) => setStudentSearchInModal(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-950"
                      />
                    </div>
                  </div>

                  {/* List Murid */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {modalClassStudents.map((s, idx) => (
                      <div 
                        key={s.$id || s.id || s.nisn || idx} 
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-indigo-950 shadow-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <span className="font-bold text-indigo-950 text-xs block">
                              {formatStudentName(s.nama || s.name)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              NIS: {s.nisn || s.code} {s.nomor_absen ? `• Absen: ${s.nomor_absen}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-indigo-500" />
                            {s.password_pin || 'murid19*'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {modalClassStudents.length === 0 && (
                      <div className="py-10 text-center text-slate-400 font-bold text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        Belum ada murid yang terdaftar di kelas ini.
                      </div>
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
