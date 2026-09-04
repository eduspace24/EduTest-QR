import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, 
  Trash2, 
  Plus, 
  Search, 
  Download, 
  Upload, 
  UserPlus, 
  Loader2, 
  Copy, 
  Check, 
  LayoutGrid, 
  Printer, 
  KeyRound, 
  QrCode, 
  X, 
  CheckCircle2, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { useAlert } from '../context/AlertContext';
import { supabase } from '../lib/supabase';
import { getCollectionData, saveCollection } from '../lib/db';
import { MURIDS_LIST, CLASSES_LIST } from '../lib/seedAccounts';
import { formatStudentName } from '../lib/utils';

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export type SortOption = 'name_asc' | 'name_desc' | 'nis_asc' | 'nis_desc' | 'class_asc' | 'class_desc';

export default function KelolaSiswa() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<any[]>(MURIDS_LIST);
  const [classes, setClasses] = useState<any[]>(CLASSES_LIST);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [activeStudentForCard, setActiveStudentForCard] = useState<any>(null);
  const [copyCode, setCopyCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    nisn: '',
    classId: '',
    noAbsen: '',
    passwordPin: 'murid19*'
  });

  const { showAlert } = useAlert();

  const fetchStudentsAndClasses = async () => {
    setLoading(true);
    try {
      // 1. Fetch from Appwrite
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../lib/appwrite');
      const [studentsRes, classesRes] = await Promise.all([
        databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.STUDENTS, [Query.limit(5000)]),
        databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.CLASSES, [Query.limit(100)])
      ]);

      if (studentsRes && studentsRes.documents && studentsRes.documents.length > 0) {
        setStudents(studentsRes.documents as any[]);
        saveCollection('students', studentsRes.documents);
      } else {
        const local = await getCollectionData('students');
        if (local && local.length > 0) {
          setStudents(local);
        } else {
          setStudents(MURIDS_LIST);
          saveCollection('students', MURIDS_LIST);
        }
      }

      if (classesRes && classesRes.documents && classesRes.documents.length > 0) {
        setClasses(classesRes.documents as any[]);
        saveCollection('classes', classesRes.documents);
      } else {
        const localClasses = await getCollectionData('classes');
        setClasses(localClasses && localClasses.length > 0 ? localClasses : CLASSES_LIST);
      }
    } catch (err) {
      console.warn('Appwrite fetch notice, using local fallback:', err);
      const [localStudents, localClasses] = await Promise.all([
        getCollectionData('students'),
        getCollectionData('classes')
      ]);
      setStudents(localStudents && localStudents.length > 0 ? localStudents : MURIDS_LIST);
      setClasses(localClasses && localClasses.length > 0 ? localClasses : CLASSES_LIST);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndClasses();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.classId) {
      showAlert({ title: 'Gagal', message: 'Nama dan Kelas wajib diisi.', type: 'error' });
      return;
    }

    const targetClass = classes.find(c => c.id === formData.classId || c.nama_kelas === formData.classId);
    const className = targetClass ? targetClass.nama_kelas || targetClass.name : formData.classId;
    const generatedNisn = formData.nisn || `NIS-${Date.now().toString().slice(-6)}`;

    const newStudent = {
      nama: formatStudentName(formData.name),
      name: formatStudentName(formData.name),
      nisn: generatedNisn,
      nama_kelas: className,
      nomor_absen: formData.noAbsen || '1',
      password_pin: formData.passwordPin || 'murid19*'
    };

    // Save to Appwrite
    try {
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, ID } = await import('../lib/appwrite');
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.STUDENTS,
        ID.unique(),
        newStudent
      );
    } catch (e) {
      console.warn('Appwrite create student notice:', e);
    }

    const updated = [{ ...newStudent, id: generatedNisn, name: newStudent.nama }, ...students];
    setStudents(updated);
    saveCollection('students', updated);

    setFormData({ name: '', nisn: '', classId: '', noAbsen: '', passwordPin: 'murid19*' });
    setShowAddModal(false);
    showAlert({ title: 'Berhasil', message: `Akun murid ${newStudent.nama} berhasil dibuat.`, type: 'success' });
  };

  const deleteStudent = (id: string, name: string) => {
    showAlert({
      title: 'Hapus Murid?',
      message: `Apakah Anda yakin ingin menghapus akun ${name}?`,
      type: 'confirm',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        try {
          const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../lib/appwrite');
          await databases.deleteDocument(APPWRITE_DATABASE_ID, COLLECTIONS.STUDENTS, id);
        } catch (e) {
          console.warn('Appwrite delete student notice:', e);
        }

        const updated = students.filter(s => (s.$id || s.id) !== id);
        setStudents(updated);
        saveCollection('students', updated);
      }
    });
  };

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
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          showAlert({ title: 'File Kosong', message: 'File tidak memiliki data murid.', type: 'error' });
          return;
        }

        const newParsedStudents = data.map((row: any, idx: number) => {
          const rawName = row['Nama'] || row['nama'] || row['Nama Murid'] || row['Nama Siswa'] || `Murid ${idx + 1}`;
          const sName = formatStudentName(rawName);
          const sNisn = String(row['NIS'] || row['NISN'] || row['nis'] || `NIS${100000 + idx}`);
          const sKelas = String(row['Kelas'] || row['kelas'] || 'Umum');
          const sAbsen = String(row['No Absen'] || row['absen'] || idx + 1);
          const sPin = String(row['PIN'] || row['Password'] || 'murid19*');

          return {
            id: crypto.randomUUID(),
            nama: sName,
            name: sName,
            nisn: sNisn,
            code: sNisn,
            nama_kelas: sKelas,
            nomor_absen: sAbsen,
            password_pin: sPin,
            role: 'murid',
            created_at: new Date().toISOString()
          };
        });

        // Insert to Supabase in bulk
        try {
          await supabase.from('students').upsert(newParsedStudents, { onConflict: 'nisn' });
        } catch (err) {
          console.warn('Supabase bulk upsert note:', err);
        }

        const combined = [...newParsedStudents, ...students.filter(s => !newParsedStudents.some(np => np.nisn === s.nisn))];
        setStudents(combined);
        saveCollection('students', combined);

        showAlert({
          title: 'Impor Berhasil',
          message: `Berhasil meng-generate ${newParsedStudents.length} akun murid ke Nineteen Exam!`,
          type: 'success'
        });
      } catch (err) {
        console.error(err);
        showAlert({ title: 'Gagal Impor', message: 'Format file tidak sesuai. Pastikan file Excel / CSV valid.', type: 'error' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const sample = [
      { 'NIS': '242510311', 'Nama': 'Rahmadina', 'Kelas': 'XII', 'No Absen': '1', 'Password': 'murid19*' },
      { 'NIS': '252610209', 'Nama': 'M Nazril', 'Kelas': 'XI', 'No Absen': '2', 'Password': 'murid19*' },
      { 'NIS': '262710001', 'Nama': 'Aditya Fathir', 'Kelas': 'X', 'No Absen': '3', 'Password': 'murid19*' }
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Murid');
    XLSX.writeFile(wb, 'Template_Impor_Akun_Murid.xlsx');
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClass]);

  const filteredStudents = useMemo(() => {
    const list = students.filter(s => {
      const nameStr = (s.nama || s.name || '').toLowerCase();
      const nisnStr = (s.nisn || s.code || '').toLowerCase();
      const classStr = String(s.nama_kelas || s.classId || '').trim();
      const cleanSearch = searchTerm.toLowerCase().trim();

      const matchSearch = !cleanSearch || 
        nameStr.includes(cleanSearch) || 
        nisnStr.includes(cleanSearch);

      const matchClass = selectedClass === 'all' || 
        classStr.toLowerCase() === selectedClass.trim().toLowerCase();

      return matchSearch && matchClass;
    });

    return list.sort((a, b) => {
      const nameA = (a.nama || a.name || '').trim().toLowerCase();
      const nameB = (b.nama || b.name || '').trim().toLowerCase();
      const nisA = String(a.nisn || a.code || '').trim();
      const nisB = String(b.nisn || b.code || '').trim();
      const classA = String(a.nama_kelas || a.classId || '').trim();
      const classB = String(b.nama_kelas || b.classId || '').trim();

      if (sortBy === 'name_asc') {
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'name_desc') {
        return nameB.localeCompare(nameA);
      }
      if (sortBy === 'nis_asc') {
        return nisA.localeCompare(nisB, undefined, { numeric: true });
      }
      if (sortBy === 'nis_desc') {
        return nisB.localeCompare(nisA, undefined, { numeric: true });
      }
      if (sortBy === 'class_asc' || sortBy === 'class_desc') {
        const rank = (k: string) => k.startsWith('X-') ? 1 : (k.startsWith('XI-') ? 2 : (k.startsWith('XII-') ? 3 : 4));
        const rA = rank(classA);
        const rB = rank(classB);
        if (rA !== rB) return sortBy === 'class_asc' ? rA - rB : rB - rA;
        const clsComp = classA.localeCompare(classB);
        if (clsComp !== 0) return sortBy === 'class_asc' ? clsComp : -clsComp;
        return nameA.localeCompare(nameB);
      }
      return nameA.localeCompare(nameB);
    });
  }, [students, searchTerm, selectedClass, sortBy]);

  const totalItems = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, startIndex, endIndex]);

  const distinctClassNames = Array.from(
    new Set<string>(students.map(s => String(s.nama_kelas || s.classId || '')).filter(Boolean))
  ).sort((a: string, b: string) => {
    const rank = (k: string) => k.startsWith('X-') ? 1 : (k.startsWith('XI-') ? 2 : (k.startsWith('XII-') ? 3 : 4));
    const rA = rank(a);
    const rB = rank(b);
    if (rA !== rB) return rA - rB;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Manajemen Akun
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1">Kelola Akun Murid</h1>
          <p className="text-slate-500 text-sm font-medium">Kelola akun login murid, PIN, cetak kartu ujian, dan impor massal CSV/Excel.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-emerald-100 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" />
            Impor Akun Massal
          </button>

          <button
            onClick={downloadTemplate}
            className="p-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
            title="Download Template Excel"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-950 text-white px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Tambah Murid
          </button>
        </div>
      </div>

      {/* Filter, Sort, and Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama murid atau NIS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:border-indigo-950 transition-all"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-3.5 bg-white rounded-2xl border border-slate-200 outline-none text-slate-700 font-bold text-sm focus:border-indigo-950 transition-all"
          >
            <option value="all">Semua Kelas ({students.length} Murid)</option>
            {distinctClassNames.map(cn => (
              <option key={cn} value={cn}>Kelas {cn}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 px-4 py-3.5 bg-white rounded-2xl border border-slate-200">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent outline-none text-slate-700 font-bold text-sm cursor-pointer"
            >
              <option value="name_asc">Abjad (A - Z)</option>
              <option value="name_desc">Abjad (Z - A)</option>
              <option value="nis_asc">NIS (0 - 9)</option>
              <option value="nis_desc">NIS (9 - 0)</option>
              <option value="class_asc">Kelas (X - XII)</option>
              <option value="class_desc">Kelas (XII - X)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-950 animate-spin" />
            <p className="text-slate-400 text-sm font-bold">Memuat data murid...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-indigo-950">Belum Ada Data Murid</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1 font-medium">
              Gunakan tombol "Impor Akun Massal" untuk memasukkan data murid dari Excel/CSV.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th 
                    onClick={() => setSortBy(prev => prev === 'name_asc' ? 'name_desc' : 'name_asc')}
                    className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-indigo-950 transition-colors"
                    title="Klik untuk mengubah urutan nama"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama & No Absen</span>
                      {sortBy === 'name_asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : sortBy === 'name_desc' ? <ArrowDown className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => setSortBy(prev => prev === 'nis_asc' ? 'nis_desc' : 'nis_asc')}
                    className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-indigo-950 transition-colors"
                    title="Klik untuk mengubah urutan NIS"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>NIS (Username)</span>
                      {sortBy === 'nis_asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : sortBy === 'nis_desc' ? <ArrowDown className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => setSortBy(prev => prev === 'class_asc' ? 'class_desc' : 'class_asc')}
                    className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-indigo-950 transition-colors"
                    title="Klik untuk mengubah urutan Kelas"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Kelas</span>
                      {sortBy === 'class_asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : sortBy === 'class_desc' ? <ArrowDown className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Password Login</th>
                  <th className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-wider">Aksi & Kartu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedStudents.map((s, idx) => {
                  const studentIndex = startIndex + idx + 1;
                  return (
                    <tr key={s.$id || s.id || `${s.nisn}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 font-black flex items-center justify-center text-xs shrink-0">
                            {s.nomor_absen || studentIndex}
                          </div>
                          <div>
                            <p className="font-bold text-indigo-950 text-sm leading-tight">{formatStudentName(s.nama || s.name)}</p>
                            <p className="text-[11px] text-slate-400 font-medium">Absen: {s.nomor_absen || '-'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-950 text-xs bg-slate-100 px-2.5 py-1 rounded-lg">
                            {s.nisn || s.code}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(s.nisn || s.code);
                              setCopyCode(s.id || s.$id);
                              setTimeout(() => setCopyCode(null), 2000);
                            }}
                            className="text-slate-400 hover:text-indigo-950 p-1"
                            title="Salin NIS"
                          >
                            {copyCode === (s.id || s.$id) ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="bg-indigo-50 text-indigo-900 text-xs font-bold px-3 py-1 rounded-xl">
                          {s.nama_kelas || s.classId || 'Umum'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="font-mono text-xs font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {s.password_pin || 'murid19*'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setActiveStudentForCard(s);
                              setShowCardModal(true);
                            }}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-950 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            title="Lihat Kartu Ujian Murid"
                          >
                            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                            Kartu Ujian
                          </button>

                          <button
                            onClick={() => deleteStudent(s.$id || s.id, s.nama || s.name)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Hapus Akun Murid"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredStudents.length > 0 && (
              <div className="px-6 py-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs font-medium text-slate-500">
                  Menampilkan <span className="font-bold text-indigo-950">{startIndex + 1}</span> - <span className="font-bold text-indigo-950">{endIndex}</span> dari <span className="font-bold text-indigo-950">{totalItems}</span> murid
                  {selectedClass !== 'all' && (
                    <span className="text-indigo-600 font-bold ml-1.5 bg-indigo-50 px-2 py-0.5 rounded-md">
                      Kelas {selectedClass}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Sebelumnya</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers(currentPage, totalPages).map((p, i) => (
                      p === '...' ? (
                        <span key={`dots-${i}`} className="px-2 text-slate-400 text-xs font-bold">...</span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          onClick={() => setCurrentPage(Number(p))}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                            currentPage === p
                              ? 'bg-indigo-950 text-white shadow-md shadow-indigo-950/20'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-indigo-950">Tambah Akun Murid</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-indigo-950">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Nama Lengkap Murid *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Muhammad Rizky"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                      NIS (Username)
                    </label>
                    <input
                      type="text"
                      placeholder="242510001"
                      value={formData.nisn}
                      onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                      No. Absen
                    </label>
                    <input
                      type="number"
                      placeholder="1"
                      value={formData.noAbsen}
                      onChange={(e) => setFormData({ ...formData, noAbsen: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Kelas Murid *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: X, XI, atau XII"
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Password Login Murid (Default: murid19*)
                  </label>
                  <input
                    type="text"
                    value={formData.passwordPin}
                    onChange={(e) => setFormData({ ...formData, passwordPin: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-indigo-950 font-bold text-sm focus:bg-white focus:border-indigo-950 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3.5 bg-indigo-950 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Simpan Murid
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kartu Ujian Murid Modal */}
      <AnimatePresence>
        {showCardModal && activeStudentForCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 space-y-6 text-center"
            >
              {/* Header Kartu */}
              <div className="border-b border-dashed border-slate-200 pb-4">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                  KARTU PESERTA UJIAN DIGITAL
                </span>
                <h3 className="text-xl font-black text-indigo-950 mt-2">Nineteen Exam</h3>
                <p className="text-xs text-slate-400 font-medium">SMAN 19 Bandung</p>
              </div>

              {/* QR Code Container */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center">
                <QRCodeSVG
                  value={JSON.stringify({
                    nisn: activeStudentForCard.nisn || activeStudentForCard.code,
                    nama: formatStudentName(activeStudentForCard.nama || activeStudentForCard.name),
                    kelas: activeStudentForCard.nama_kelas || activeStudentForCard.classId
                  })}
                  size={150}
                  level="M"
                />
                <p className="font-mono text-xs font-black text-indigo-950 mt-3">
                  {activeStudentForCard.nisn || activeStudentForCard.code}
                </p>
              </div>

              {/* Detail Murid */}
              <div className="space-y-2 text-left bg-slate-50/70 p-4 rounded-2xl text-xs border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">No. Peserta:</span>
                  <span className="font-mono font-bold text-indigo-950">
                    2627-{activeStudentForCard.nama_kelas || activeStudentForCard.classId || 'X'}-{String(activeStudentForCard.noAbsen || activeStudentForCard.nomor_absen || '1').padStart(2, '0')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Nama Murid:</span>
                  <span className="font-bold text-indigo-950 truncate max-w-[180px]">{formatStudentName(activeStudentForCard.nama || activeStudentForCard.name)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Kelas / Rombel:</span>
                  <span className="font-bold text-indigo-950">{activeStudentForCard.nama_kelas || activeStudentForCard.classId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Ruang Ujian:</span>
                  <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Ruang {String(Math.ceil((parseInt(activeStudentForCard.noAbsen || activeStudentForCard.nomor_absen || '1') || 1) / 20) || 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Sesi Ujian:</span>
                  <span className="font-bold text-indigo-950">Sesi 1 (07.30 - 09.30)</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 font-medium">Password Login:</span>
                  <span className="font-mono font-black text-indigo-950">{activeStudentForCard.password_pin || 'murid19*'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCardModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-[2] py-3 bg-indigo-950 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Kartu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
