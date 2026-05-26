import { useState, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  BookOpen,
  ChevronRight,
  PlusCircle,
  X,
  Check,
  Image as ImageIcon,
  Loader2,
  Upload,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { useAlert } from '../context/AlertContext';
import { 
  getOrCreateRootFolder, 
  saveJsonToDrive, 
  uploadFileToDrive, 
  getFileUrl 
} from '../lib/googleDrive';
import { useGoogleDrive } from '../context/GoogleDriveContext';
import { getCollectionData, saveCollection } from '../lib/db';
import { useRef } from 'react';
// @ts-ignore
import mammoth from 'mammoth';

export default function BankSoal() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isInitialized, rootFolderId } = useGoogleDrive();
  const [searchTerm, setSearchTerm] = useState('');
  const { showAlert } = useAlert();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    type: 'Pilihan Ganda',
    category: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    jawaban_benar: 'a',
    image_url: ''
  });

  useEffect(() => {
    const fetchQuestions = async () => {
      const data = await getCollectionData('bank_soal');
      setQuestions(data);
      setLoading(false);
    };
    fetchQuestions();
  }, []);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncToDrive = async (updatedQuestions: any[]) => {
    await saveCollection('bank_soal', updatedQuestions);
    try {
      const folderId = await getOrCreateRootFolder();
      await saveJsonToDrive(folderId, 'bank_soal.json', updatedQuestions);
    } catch (err) {
      console.error('Failed to sync bank soal:', err);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: Size check (e.g., 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showAlert({ title: 'Gagal', message: 'Ukuran gambar terlalu besar (Maks 2MB)', type: 'warning' });
      return;
    }

    try {
      setIsUploading(true);
      const folderId = await getOrCreateRootFolder();
      const fileId = await uploadFileToDrive(file, folderId) as string;
      const url = getFileUrl(fileId);
      
      setNewQuestion(prev => ({ ...prev, image_url: url }));
      showAlert({ title: 'Berhasil', message: 'Gambar berhasil diupload.', type: 'success' });
    } catch (err) {
      console.error('Upload error:', err);
      showAlert({ title: 'Gagal', message: 'Gagal mengupload gambar ke Drive.', type: 'error' });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const excelInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);

  const handleTypeChange = (type: string) => {
    let extra = {};
    if (type === 'Pilihan Ganda Asosiatif (TKA)') {
      extra = {
        option_a: '1, 2, dan 3 benar',
        option_b: '1 dan 3 benar',
        option_c: '2 dan 4 benar',
        option_d: 'Hanya 4 yang benar',
        option_e: 'Semua pernyataan benar',
        jawaban_benar: 'a'
      };
    } else if (type === 'Hubungan Sebab Akibat (TKA)') {
      extra = {
        option_a: 'Pernyataan benar, alasan benar, dan keduanya menunjukkan hubungan sebab akibat',
        option_b: 'Pernyataan benar, alasan benar, tetapi keduanya tidak menunjukkan hubungan sebab akibat',
        option_c: 'Pernyataan benar dan alasan salah',
        option_d: 'Pernyataan salah dan alasan benar',
        option_e: 'Pernyataan dan alasan keduanya salah',
        jawaban_benar: 'a'
      };
    } else if (type === 'Pilihan Ganda') {
      extra = {
        option_a: newQuestion.option_a === '1, 2, dan 3 benar' || newQuestion.option_a.includes('Pernyataan benar') ? '' : newQuestion.option_a,
        option_b: newQuestion.option_b === '1 dan 3 benar' || newQuestion.option_b.includes('Pernyataan benar') ? '' : newQuestion.option_b,
        option_c: newQuestion.option_c === '2 dan 4 benar' || newQuestion.option_c.includes('Pernyataan benar') ? '' : newQuestion.option_c,
        option_d: newQuestion.option_d === 'Hanya 4 yang benar' || newQuestion.option_d.includes('Pernyataan salah') ? '' : newQuestion.option_d,
        option_e: newQuestion.option_e === 'Semua pernyataan benar' || newQuestion.option_e.includes('Pernyataan dan alasan') ? '' : newQuestion.option_e
      };
    } else if (type === 'Essay') {
      extra = {
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        option_e: '',
        jawaban_benar: ''
      };
    }
    setNewQuestion({
      ...newQuestion,
      type,
      ...extra
    });
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Pertanyaan': 'Manakah dari bangun berikut yang memiliki 4 sisi sama panjang?',
        'Tipe': 'Pilihan Ganda',
        'Kategori': 'Matematika',
        'Opsi A': 'Persegi',
        'Opsi B': 'Persegi Panjang',
        'Opsi C': 'Segitiga',
        'Opsi D': 'Lingkaran',
        'Opsi E': 'Trapesium',
        'Jawaban Benar': 'a',
        'Link Gambar': ''
      },
      {
        'Pertanyaan': 'Jika (1) x > 0, (2) y > 0, (3) x+y > 0, (4) x*y < 0. Manakah pernyataan yang benar jika diketahui hasil penjumlahan bernilai positif dan perkalian negatif?',
        'Tipe': 'Pilihan Ganda Asosiatif (TKA)',
        'Kategori': 'Matematika TKA',
        'Opsi A': '',
        'Opsi B': '',
        'Opsi C': '',
        'Opsi D': '',
        'Opsi E': '',
        'Jawaban Benar': 'a',
        'Link Gambar': ''
      },
      {
        'Pertanyaan': 'Logam natrium sangat reaktif terhadap air. SEBAB Logam natrium memiliki energi ionisasi yang sangat kecil.',
        'Tipe': 'Hubungan Sebab Akibat (TKA)',
        'Kategori': 'Kimia TKA',
        'Opsi A': '',
        'Opsi B': '',
        'Opsi C': '',
        'Opsi D': '',
        'Opsi E': '',
        'Jawaban Benar': 'a',
        'Link Gambar': ''
      },
      {
        'Pertanyaan': 'Jelaskan perbedaan antara pembelahan mitosis dan meiosis!',
        'Tipe': 'Essay',
        'Kategori': 'Biologi',
        'Opsi A': '',
        'Opsi B': '',
        'Opsi C': '',
        'Opsi D': '',
        'Opsi E': '',
        'Jawaban Benar': '',
        'Link Gambar': ''
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Soal');
    XLSX.writeFile(wb, 'Template_Bank_Soal_EduTest.xlsx');
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
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showAlert({ title: 'Gagal', message: 'File Excel kosong.', type: 'error' });
          return;
        }

        const newQuestions = data.map((row: any, idx: number) => {
          const type = row['Tipe'] || row['type'] || 'Pilihan Ganda';
          let option_a = String(row['Opsi A'] || row['option_a'] || '');
          let option_b = String(row['Opsi B'] || row['option_b'] || '');
          let option_c = String(row['Opsi C'] || row['option_c'] || '');
          let option_d = String(row['Opsi D'] || row['option_d'] || '');
          let option_e = String(row['Opsi E'] || row['option_e'] || '');
          let jawaban_benar = String(row['Jawaban Benar'] || row['jawaban_benar'] || 'a').toLowerCase().trim();

          // Auto-fill TKA options if blank
          if (type === 'Pilihan Ganda Asosiatif (TKA)' && (!option_a || option_a.trim() === '')) {
            option_a = '1, 2, dan 3 benar';
            option_b = '1 dan 3 benar';
            option_c = '2 dan 4 benar';
            option_d = 'Hanya 4 yang benar';
            option_e = 'Semua pernyataan benar';
          } else if (type === 'Hubungan Sebab Akibat (TKA)' && (!option_a || option_a.trim() === '')) {
            option_a = 'Pernyataan benar, alasan benar, dan keduanya menunjukkan hubungan sebab akibat';
            option_b = 'Pernyataan benar, alasan benar, tetapi keduanya tidak menunjukkan hubungan sebab akibat';
            option_c = 'Pernyataan benar dan alasan salah';
            option_d = 'Pernyataan salah dan alasan benar';
            option_e = 'Pernyataan dan alasan keduanya salah';
          }

          return {
            id: `${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            text: row['Pertanyaan'] || row['text'] || '',
            type,
            category: row['Kategori'] || row['category'] || 'Umum',
            option_a,
            option_b,
            option_c,
            option_d,
            option_e,
            jawaban_benar,
            image_url: row['Link Gambar'] || row['image_url'] || ''
          };
        }).filter(q => q.text);

        if (newQuestions.length === 0) {
          showAlert({ title: 'Gagal', message: 'Tidak ada data soal yang valid ditemukan (Kolom "Pertanyaan" wajib ada).', type: 'error' });
          return;
        }

        const updated = [...questions, ...newQuestions];
        setQuestions(updated);
        await syncToDrive(updated);

        showAlert({ 
          title: 'Berhasil', 
          message: `${newQuestions.length} soal berhasil diimpor ke Bank Soal.`, 
          type: 'success' 
        });
      } catch (err) {
        console.error('Excel import error:', err);
        showAlert({ title: 'Error', message: 'Gagal memproses file Excel.', type: 'error' });
      }
      if (excelInputRef.current) excelInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleImportWord = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          showAlert({ title: 'Gagal', message: 'Gagal membaca file.', type: 'error' });
          return;
        }

        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const table = doc.querySelector('table');
        if (!table) {
          showAlert({ title: 'Gagal', message: 'Tabel soal tidak ditemukan di dalam dokumen Word.', type: 'error' });
          return;
        }

        const trs = Array.from(table.querySelectorAll('tr'));
        if (trs.length < 2) {
          showAlert({ title: 'Gagal', message: 'Tabel soal harus memiliki baris header dan minimal satu baris data.', type: 'error' });
          return;
        }

        const headers = Array.from(trs[0].querySelectorAll('td, th')).map(td => (td.textContent || '').trim());
        const dataRows: any[] = [];

        for (let i = 1; i < trs.length; i++) {
          const cells = Array.from(trs[i].querySelectorAll('td'));
          const rowObj: Record<string, string> = {};
          headers.forEach((header, cellIdx) => {
            if (header) {
              rowObj[header] = (cells[cellIdx]?.textContent || '').trim();
            }
          });
          dataRows.push(rowObj);
        }

        if (dataRows.length === 0) {
          showAlert({ title: 'Gagal', message: 'Dokumen Word kosong.', type: 'error' });
          return;
        }

        const newQuestions = dataRows.map((row: any, idx: number) => {
          const type = row['Tipe'] || row['type'] || 'Pilihan Ganda';
          let option_a = String(row['Opsi A'] || row['option_a'] || '');
          let option_b = String(row['Opsi B'] || row['option_b'] || '');
          let option_c = String(row['Opsi C'] || row['option_c'] || '');
          let option_d = String(row['Opsi D'] || row['option_d'] || '');
          let option_e = String(row['Opsi E'] || row['option_e'] || '');
          let jawaban_benar = String(row['Jawaban Benar'] || row['jawaban_benar'] || 'a').toLowerCase().trim();

          // Auto-fill TKA options if blank
          if (type === 'Pilihan Ganda Asosiatif (TKA)' && (!option_a || option_a.trim() === '')) {
            option_a = '1, 2, dan 3 benar';
            option_b = '1 dan 3 benar';
            option_c = '2 dan 4 benar';
            option_d = 'Hanya 4 yang benar';
            option_e = 'Semua pernyataan benar';
          } else if (type === 'Hubungan Sebab Akibat (TKA)' && (!option_a || option_a.trim() === '')) {
            option_a = 'Pernyataan benar, alasan benar, dan keduanya menunjukkan hubungan sebab akibat';
            option_b = 'Pernyataan benar, alasan benar, tetapi keduanya tidak menunjukkan hubungan sebab akibat';
            option_c = 'Pernyataan benar dan alasan salah';
            option_d = 'Pernyataan salah dan alasan benar';
            option_e = 'Pernyataan dan alasan keduanya salah';
          }

          return {
            id: `${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            text: row['Pertanyaan'] || row['text'] || '',
            type,
            category: row['Kategori'] || row['category'] || 'Umum',
            option_a,
            option_b,
            option_c,
            option_d,
            option_e,
            jawaban_benar,
            image_url: row['Link Gambar'] || row['image_url'] || ''
          };
        }).filter(q => q.text);

        if (newQuestions.length === 0) {
          showAlert({ title: 'Gagal', message: 'Tidak ada data soal yang valid ditemukan (Kolom "Pertanyaan" wajib ada).', type: 'error' });
          return;
        }

        const updated = [...questions, ...newQuestions];
        setQuestions(updated);
        await syncToDrive(updated);

        showAlert({ 
          title: 'Berhasil', 
          message: `${newQuestions.length} soal berhasil diimpor dari Word.`, 
          type: 'success' 
        });
      } catch (err) {
        console.error('Word import error:', err);
        showAlert({ title: 'Error', message: 'Gagal memproses file Word. Pastikan format tabel di dalam berkas docx sudah benar.', type: 'error' });
      }
      if (wordInputRef.current) wordInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const deleteQuestion = (id: string) => {
    showAlert({
      title: 'Hapus Soal?',
      message: 'Apakah Anda yakin ingin menghapus soal ini dari Bank Soal?',
      type: 'confirm',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        const updated = questions.filter(q => q.id !== id);
        setQuestions(updated);
        await syncToDrive(updated);
        showAlert({ title: 'Terhapus', message: 'Soal berhasil dihapus.', type: 'success' });
      }
    });
  };

  const saveQuestion = async () => {
    if (!newQuestion.text.trim()) {
      showAlert({ title: 'Peringatan', message: 'Pertanyaan wajib diisi!', type: 'warning' });
      return;
    }
    
    if (editingId) {
      const updated = questions.map(q => q.id === editingId ? { ...q, ...newQuestion } : q);
      setQuestions(updated);
      await syncToDrive(updated);
      setEditingId(null);
    } else {
      const question = {
        id: Date.now().toString(),
        ...newQuestion
      };
      const updated = [...questions, question];
      setQuestions(updated);
      await syncToDrive(updated);
    }
    
    setShowAddModal(false);
    setNewQuestion({
      text: '',
      type: 'Pilihan Ganda',
      category: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      option_e: '',
      jawaban_benar: 'a',
      image_url: ''
    });
    showAlert({ title: 'Berhasil', message: editingId ? 'Soal berhasil diperbarui!' : 'Soal berhasil ditambahkan!', type: 'success' });
  };

  const openEditModal = (q: any) => {
    setEditingId(q.id);
    setNewQuestion({
      text: q.text,
      type: q.type,
      category: q.category,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e || '',
      jawaban_benar: q.jawaban_benar,
      image_url: q.image_url || ''
    });
    setShowAddModal(true);
  };

  const filteredQuestions = questions.filter(q => 
    q.text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-20 bg-slate-100 rounded-3xl w-full"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-40 bg-slate-100 rounded-3xl"></div>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="tracking-tight">Bank Soal</h2>
          <p className="text-slate-500 text-sm font-medium">Koleksi pertanyaan ujian Anda yang tersimpan di Cloud.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <input 
            type="file" ref={excelInputRef} className="hidden" 
            accept=".xlsx,.xls" onChange={handleImportExcel} 
          />
          <input 
            type="file" ref={wordInputRef} className="hidden" 
            accept=".docx" onChange={handleImportWord} 
          />
          <button 
            onClick={downloadTemplate}
            className="bg-white border border-slate-200 text-indigo-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Template Excel
          </button>
          <a 
            href="/Template_Bank_Soal_EduTest.docx" download
            className="bg-white border border-slate-200 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Template Word
          </a>
          <button 
            onClick={() => excelInputRef.current?.click()}
            className="bg-white border border-slate-200 text-emerald-600 px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all active:scale-95 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Impor Excel
          </button>
          <button 
            onClick={() => wordInputRef.current?.click()}
            className="bg-white border border-slate-200 text-sky-600 px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-sky-50 transition-all active:scale-95 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Impor Word
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-950 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-900 transition-all active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Tambah Manual
          </button>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm group focus-within:ring-4 focus-within:ring-indigo-950/5 transition-all">
        <Search className="text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
        <input 
          type="text" placeholder="Cari soal berdasarkan teks..."
          className="flex-1 bg-transparent border-none outline-none font-bold text-indigo-950 text-sm placeholder:font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-20 text-center border border-slate-100 border-dashed">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-indigo-950">Tidak Ada Soal</h3>
          <p className="text-slate-400 mt-2 max-w-sm mx-auto text-sm font-medium">Mulai buat ujian baru untuk mengisi koleksi soal Anda secara otomatis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredQuestions.map((q) => (
              <motion.div 
                layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                key={q.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col hover:shadow-xl transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {q.category || 'Umum'}
                  </div>
                  <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-indigo-950 font-bold text-sm sm:text-base mb-4 line-clamp-2">{q.text}</p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{q.type}</span>
                  <button 
                    onClick={() => openEditModal(q)}
                    className="text-blue-600 font-bold text-[11px] flex items-center gap-1 hover:underline"
                  >
                    Edit Detail <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {showAddModal && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-950 text-white p-2 rounded-xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-indigo-950">{editingId ? 'Edit Soal' : 'Tambah Soal Baru'}</h3>
              </div>
              <button 
                onClick={() => { setShowAddModal(false); setEditingId(null); }} 
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Pertanyaan</label>
                <textarea
                  placeholder="Masukkan pertanyaan..."
                  className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/10 min-h-[100px]"
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Gambar / Lampiran (Opsional)</label>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleUploadImage}
                />

                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Link gambar atau upload file..."
                      className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-indigo-950 truncate"
                      value={newQuestion.image_url}
                      onChange={(e) => setNewQuestion({ ...newQuestion, image_url: e.target.value })}
                    />
                  </div>
                  <button 
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {isUploading ? 'Proses...' : 'Pilih File'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium px-1">Tip: Klik "Pilih File" untuk upload dari galeri/folder.</p>
              </div>

              {newQuestion.image_url && (
                  <div className="relative w-full max-h-40 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={newQuestion.image_url} alt="Preview" className="w-full h-full object-contain" />
                    <button 
                      onClick={() => setNewQuestion({ ...newQuestion, image_url: '' })}
                      className="absolute top-2 right-2 bg-white/80 backdrop-blur p-1.5 rounded-lg shadow-sm"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tipe</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none font-bold text-xs text-indigo-950 cursor-pointer"
                    value={newQuestion.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  >
                    <option value="Pilihan Ganda">Pilihan Ganda (5 Opsi)</option>
                    <option value="Pilihan Ganda Asosiatif (TKA)">Pilihan Ganda Asosiatif (TKA)</option>
                    <option value="Hubungan Sebab Akibat (TKA)">Hubungan Sebab Akibat (TKA)</option>
                    <option value="Essay">Essay</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Kategori/Mapel</label>
                  <input
                    type="text"
                    placeholder="Contoh: Matematika"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                    value={newQuestion.category}
                    onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                  />
                </div>
              </div>

              {newQuestion.type !== 'Essay' && (
                <div className="space-y-3 pt-2">
                  <label className="text-sm font-bold text-slate-700">Opsi Jawaban</label>
                  {[
                    { key: 'option_a', label: 'A' },
                    { key: 'option_b', label: 'B' },
                    { key: 'option_c', label: 'C' },
                    { key: 'option_d', label: 'D' },
                    { key: 'option_e', label: 'E' }
                  ].map((opt) => (
                    <div key={opt.key} className="flex items-center gap-3">
                      <button
                        onClick={() => setNewQuestion({ ...newQuestion, jawaban_benar: opt.key.replace('option_', '') })}
                        className={cn(
                          "w-10 h-10 rounded-xl font-bold flex items-center justify-center border-2 transition-all",
                          newQuestion.jawaban_benar === opt.key.replace('option_', '') 
                            ? "bg-emerald-500 border-emerald-500 text-white" 
                            : "border-slate-200 text-slate-300"
                        )}
                      >
                        {opt.label}
                      </button>
                      <input
                        type="text"
                        placeholder={`Pilihan ${opt.label}`}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                        value={newQuestion[opt.key as keyof typeof newQuestion]}
                        onChange={(e) => setNewQuestion({ ...newQuestion, [opt.key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-500">
                Batal
              </button>
              <button onClick={saveQuestion} className="flex-1 py-3 rounded-xl bg-indigo-950 text-white font-bold flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Simpan
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
