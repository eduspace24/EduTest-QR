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
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
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
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-950 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-900 transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          Tambah Soal Manual
        </button>
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                    value={newQuestion.type}
                    onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                  >
                    <option value="Pilihan Ganda">Pilihan Ganda</option>
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

              {newQuestion.type === 'Pilihan Ganda' && (
                <div className="space-y-3 pt-2">
                  <label className="text-sm font-bold text-slate-700">Opsi Jawaban</label>
                  {[
                    { key: 'option_a', label: 'A' },
                    { key: 'option_b', label: 'B' },
                    { key: 'option_c', label: 'C' },
                    { key: 'option_d', label: 'D' }
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
