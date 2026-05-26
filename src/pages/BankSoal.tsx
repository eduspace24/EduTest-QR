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
  Download,
  Folder,
  FolderPlus,
  ArrowLeft,
  Edit3,
  MoreVertical,
  FolderOpen
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
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Folder & Selection States
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [customFolders, setCustomFolders] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('edu_custom_folders') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [selectedFolderToRename, setSelectedFolderToRename] = useState<string | null>(null);
  const [renameFolderInput, setRenameFolderInput] = useState('');
  const [targetBatchMoveFolder, setTargetBatchMoveFolder] = useState('');
  const [autoDetectCategory, setAutoDetectCategory] = useState(() => {
    return localStorage.getItem('edu_auto_detect_category') !== 'false';
  });
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

          // Determine category based on autoDetectCategory
          let finalCategory = '';
          if (autoDetectCategory) {
            finalCategory = row['Kategori'] || row['category'] || '';
          } else {
            // Import to active folder
            finalCategory = (activeFolder === 'Umum' ? '' : activeFolder) || '';
          }

          return {
            id: `${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            text: row['Pertanyaan'] || row['text'] || '',
            type,
            category: finalCategory,
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

        const result = await mammoth.extractRawText({ arrayBuffer });
        const rawText = result.value;

        if (!rawText || !rawText.trim()) {
          showAlert({ title: 'Gagal', message: 'Dokumen Word kosong.', type: 'error' });
          return;
        }

        const normalizedText = rawText.replace(/\r\n/g, '\n');
        const lines = normalizedText.split('\n').map(l => l.trim());
        
        const dataQuestions: any[] = [];
        let currentQuestion: any = null;

        for (const line of lines) {
          if (!line) continue;

          // Check if line starts a new question
          const startMatch = line.match(/^(\d+)[\s.)-]+\s*(.*)/);
          if (startMatch) {
            // Save previous question if valid
            if (currentQuestion) {
              const hasType = !!currentQuestion.type;
              const hasOptions = !!(currentQuestion.option_a || currentQuestion.option_b);
              const hasJawaban = !!currentQuestion.jawaban_benar;
              
              if (hasType || hasOptions || hasJawaban) {
                dataQuestions.push(currentQuestion);
              }
            }
            
            // Start new question
            currentQuestion = {
              text: startMatch[2].trim(),
              type: '',
              category: 'Umum',
              option_a: '',
              option_b: '',
              option_c: '',
              option_d: '',
              option_e: '',
              jawaban_benar: '',
              image_url: ''
            };
            continue;
          }

          if (!currentQuestion) continue;

          // Check field prefixes
          const isField = line.match(/^(tipe|kategori|jawaban|gambar)\s*:/i) || line.match(/^[a-e]\s*[:.]/i);
          if (isField) {
            if (line.match(/^tipe\s*:/i)) {
              currentQuestion.type = line.substring(line.indexOf(':') + 1).trim();
            } else if (line.match(/^kategori\s*:/i)) {
              currentQuestion.category = line.substring(line.indexOf(':') + 1).trim();
            } else if (line.match(/^gambar\s*:/i)) {
              currentQuestion.image_url = line.substring(line.indexOf(':') + 1).trim();
            } else if (line.match(/^jawaban\s*:/i)) {
              const ans = line.substring(line.indexOf(':') + 1).trim().toLowerCase();
              if (ans.length > 0) {
                currentQuestion.jawaban_benar = ans.substring(0, 1);
              }
            } else if (line.match(/^a\s*[:.]/i)) {
              currentQuestion.option_a = line.replace(/^a\s*[:.]/i, '').trim();
            } else if (line.match(/^b\s*[:.]/i)) {
              currentQuestion.option_b = line.replace(/^b\s*[:.]/i, '').trim();
            } else if (line.match(/^c\s*[:.]/i)) {
              currentQuestion.option_c = line.replace(/^c\s*[:.]/i, '').trim();
            } else if (line.match(/^d\s*[:.]/i)) {
              currentQuestion.option_d = line.replace(/^d\s*[:.]/i, '').trim();
            } else if (line.match(/^e\s*[:.]/i)) {
              currentQuestion.option_e = line.replace(/^e\s*[:.]/i, '').trim();
            }
          } else {
            // Append to question text if it's multi-line before options start
            if (!currentQuestion.option_a && !currentQuestion.option_b && !currentQuestion.option_c) {
              currentQuestion.text += '\n' + line;
            }
          }
        }

        // Push last question if valid
        if (currentQuestion) {
          const hasType = !!currentQuestion.type;
          const hasOptions = !!(currentQuestion.option_a || currentQuestion.option_b);
          const hasJawaban = !!currentQuestion.jawaban_benar;
          
          if (hasType || hasOptions || hasJawaban) {
            dataQuestions.push(currentQuestion);
          }
        }

        if (dataQuestions.length === 0) {
          showAlert({ title: 'Gagal', message: 'Tidak ada data soal yang valid ditemukan di dalam dokumen Word.', type: 'error' });
          return;
        }

        // Map and normalize fields
        const finalizedQuestions = dataQuestions.map((q, idx) => {
          let normalizedType = 'Pilihan Ganda';
          const typeLower = (q.type || '').toLowerCase();
          
          if (typeLower.includes('asosiatif')) {
            normalizedType = 'Pilihan Ganda Asosiatif (TKA)';
          } else if (typeLower.includes('sebab') || typeLower.includes('akibat')) {
            normalizedType = 'Hubungan Sebab Akibat (TKA)';
          } else if (typeLower.includes('essay') || typeLower.includes('uraian')) {
            normalizedType = 'Essay';
          }

          let option_a = q.option_a;
          let option_b = q.option_b;
          let option_c = q.option_c;
          let option_d = q.option_d;
          let option_e = q.option_e;

          if (normalizedType === 'Pilihan Ganda Asosiatif (TKA)' && (!option_a || option_a.trim() === '')) {
            option_a = '1, 2, dan 3 benar';
            option_b = '1 dan 3 benar';
            option_c = '2 dan 4 benar';
            option_d = 'Hanya 4 yang benar';
            option_e = 'Semua pernyataan benar';
          } else if (normalizedType === 'Hubungan Sebab Akibat (TKA)' && (!option_a || option_a.trim() === '')) {
            option_a = 'Pernyataan benar, alasan benar, dan keduanya menunjukkan hubungan sebab akibat';
            option_b = 'Pernyataan benar, alasan benar, tetapi keduanya tidak menunjukkan hubungan sebab akibat';
            option_c = 'Pernyataan benar dan alasan salah';
            option_d = 'Pernyataan salah dan alasan benar';
            option_e = 'Pernyataan dan alasan keduanya salah';
          }

          // Determine category based on autoDetectCategory
          let finalCategory = '';
          if (autoDetectCategory) {
            finalCategory = q.category || '';
          } else {
            // Import to active folder
            finalCategory = (activeFolder === 'Umum' ? '' : activeFolder) || '';
          }

          return {
            id: `${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            text: q.text.trim(),
            type: normalizedType,
            category: finalCategory,
            option_a,
            option_b,
            option_c,
            option_d,
            option_e,
            jawaban_benar: q.jawaban_benar || 'a',
            image_url: q.image_url || ''
          };
        });

        const updated = [...questions, ...finalizedQuestions];
        setQuestions(updated);
        await syncToDrive(updated);

        showAlert({ 
          title: 'Berhasil', 
          message: `${finalizedQuestions.length} soal berhasil diimpor dari Word.`, 
          type: 'success' 
        });
      } catch (err) {
        console.error('Word import error:', err);
        showAlert({ title: 'Error', message: 'Gagal memproses file Word. Pastikan format penulisan soal sudah benar.', type: 'error' });
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

  const handleCreateFolder = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (foldersList.some(f => f.toLowerCase() === trimmed.toLowerCase())) {
      showAlert({ title: 'Peringatan', message: 'Folder dengan nama ini sudah ada.', type: 'warning' });
      return;
    }
    const updated = [...customFolders, trimmed];
    setCustomFolders(updated);
    localStorage.setItem('edu_custom_folders', JSON.stringify(updated));
    setShowCreateFolderModal(false);
    setNewFolderNameInput('');
    showAlert({ title: 'Berhasil', message: `Folder "${trimmed}" berhasil dibuat.`, type: 'success' });
  };

  const handleRenameFolder = async (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || oldName === trimmedNew) return;
    
    if (foldersList.some(f => f.toLowerCase() === trimmedNew.toLowerCase() && f !== oldName)) {
      showAlert({ title: 'Peringatan', message: 'Folder dengan nama ini sudah ada.', type: 'warning' });
      return;
    }

    const updatedQuestions = questions.map(q => {
      const cat = (q.category || '').trim();
      const isOld = oldName === 'Umum' ? (cat === '' || cat === 'Umum') : (cat === oldName);
      if (isOld) {
        return { ...q, category: trimmedNew };
      }
      return q;
    });

    let updatedCustom = customFolders.filter(f => f !== oldName);
    if (trimmedNew !== 'Umum' && !updatedCustom.includes(trimmedNew)) {
      updatedCustom.push(trimmedNew);
    }
    setCustomFolders(updatedCustom);
    localStorage.setItem('edu_custom_folders', JSON.stringify(updatedCustom));

    setQuestions(updatedQuestions);
    await syncToDrive(updatedQuestions);

    if (activeFolder === oldName) {
      setActiveFolder(trimmedNew);
    }
    
    setShowRenameFolderModal(false);
    setSelectedFolderToRename(null);
    setRenameFolderInput('');
    showAlert({ title: 'Berhasil', message: 'Folder berhasil diubah namanya.', type: 'success' });
  };

  const handleDeleteFolder = (folderName: string) => {
    if (folderName === 'Umum') {
      showAlert({ title: 'Gagal', message: 'Folder default "Umum" tidak dapat dihapus.', type: 'error' });
      return;
    }
    
    const count = questions.filter(q => (q.category || '').trim() === folderName).length;
    
    showAlert({
      title: 'Hapus Folder?',
      message: count > 0 
        ? `Apakah Anda yakin ingin menghapus folder "${folderName}" beserta seluruh ${count} soal di dalamnya?`
        : `Apakah Anda yakin ingin menghapus folder kosong "${folderName}"?`,
      type: 'confirm',
      confirmText: 'Ya, Hapus Semua',
      onConfirm: async () => {
        const updatedQuestions = questions.filter(q => (q.category || '').trim() !== folderName);
        
        const updatedCustom = customFolders.filter(f => f !== folderName);
        setCustomFolders(updatedCustom);
        localStorage.setItem('edu_custom_folders', JSON.stringify(updatedCustom));

        setQuestions(updatedQuestions);
        await syncToDrive(updatedQuestions);
        
        if (activeFolder === folderName) {
          setActiveFolder(null);
        }
        showAlert({ title: 'Terhapus', message: 'Folder berhasil dihapus.', type: 'success' });
      }
    });
  };

  const toggleSelectQuestion = (id: string) => {
    if (selectedQuestions.includes(id)) {
      setSelectedQuestions(selectedQuestions.filter(qid => qid !== id));
    } else {
      setSelectedQuestions([...selectedQuestions, id]);
    }
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredQuestions.map(q => q.id);
    const allSelected = visibleIds.every(id => selectedQuestions.includes(id));
    if (allSelected) {
      setSelectedQuestions(selectedQuestions.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedQuestions(Array.from(new Set([...selectedQuestions, ...visibleIds])));
    }
  };

  const handleBatchDelete = () => {
    if (selectedQuestions.length === 0) return;
    
    showAlert({
      title: 'Hapus Soal Terpilih?',
      message: `Apakah Anda yakin ingin menghapus ${selectedQuestions.length} soal terpilih dari Bank Soal?`,
      type: 'confirm',
      confirmText: 'Ya, Hapus Semua',
      onConfirm: async () => {
        const updatedQuestions = questions.filter(q => !selectedQuestions.includes(q.id));
        setQuestions(updatedQuestions);
        await syncToDrive(updatedQuestions);
        setSelectedQuestions([]);
        showAlert({ title: 'Terhapus', message: 'Soal terpilih berhasil dihapus.', type: 'success' });
      }
    });
  };

  const handleBatchMove = async (targetFolder: string) => {
    if (selectedQuestions.length === 0 || !targetFolder) return;
    
    const folderName = targetFolder === 'Umum' ? '' : targetFolder;

    const updatedQuestions = questions.map(q => {
      if (selectedQuestions.includes(q.id)) {
        return { ...q, category: folderName };
      }
      return q;
    });

    setQuestions(updatedQuestions);
    await syncToDrive(updatedQuestions);
    setSelectedQuestions([]);
    setShowBatchMoveModal(false);
    showAlert({ title: 'Berhasil', message: `Berhasil memindahkan ${selectedQuestions.length} soal ke folder "${targetFolder}".`, type: 'success' });
  };

  // Get all unique categories from questions (map empty/trimmed categories to 'Umum')
  const uniqueCategories = Array.from(new Set(questions.map(q => {
    const cat = (q.category || '').trim();
    return cat === '' ? 'Umum' : cat;
  })));
  
  // Combine custom folders and unique categories (excluding 'Umum' which is always present)
  const combinedFoldersList = Array.from(new Set([
    ...uniqueCategories,
    ...customFolders
  ])).filter(f => f !== 'Umum');

  const foldersList = ['Umum', ...combinedFoldersList];

  const isSearching = searchTerm.trim().length > 0;

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFolder === null) {
      // At root level, show questions only if globally searching
      return isSearching;
    }
    
    // Inside a folder: filter by activeFolder name
    const cat = (q.category || '').trim();
    const normalizedCat = cat === '' ? 'Umum' : cat;
    return normalizedCat === activeFolder;
  });

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-20 bg-slate-100 rounded-3xl w-full"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-40 bg-slate-100 rounded-3xl"></div>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {activeFolder !== null ? (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
              <button 
                onClick={() => { setActiveFolder(null); setSelectedQuestions([]); }} 
                className="hover:text-indigo-950 transition-colors flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer outline-none font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali
              </button>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-indigo-950 font-black flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-blue-500 fill-blue-50" /> {activeFolder}
              </span>
            </div>
          ) : null}
          <h2 className="tracking-tight">{activeFolder !== null ? activeFolder : 'Bank Soal'}</h2>
          <p className="text-slate-500 text-sm font-medium">
            {activeFolder !== null 
              ? `Koleksi soal di folder ${activeFolder}.` 
              : 'Koleksi pertanyaan ujian Anda yang tersimpan di Cloud.'}
          </p>
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
            onClick={() => setShowTemplateModal(true)}
            className="bg-white border border-slate-200 text-indigo-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Template
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-white border border-slate-200 text-emerald-600 px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all active:scale-95 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Impor Soal
          </button>
          <button 
            onClick={() => {
              setNewQuestion(prev => ({ ...prev, category: (activeFolder === 'Umum' ? '' : activeFolder) || '' }));
              setShowAddModal(true);
            }}
            className="bg-indigo-950 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-900 transition-all active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Tambah Soal
          </button>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm group focus-within:ring-4 focus-within:ring-indigo-950/5 transition-all">
        <Search className="text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
        <input 
          type="text" 
          placeholder={activeFolder === null ? "Cari soal secara global di semua folder..." : `Cari soal di folder ${activeFolder}...`}
          className="flex-1 bg-transparent border-none outline-none font-bold text-indigo-950 text-sm placeholder:font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {activeFolder === null && !isSearching ? (
        /* Folder Directory Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {foldersList.map(folder => {
            const count = questions.filter(q => {
              const cat = (q.category || '').trim();
              const norm = cat === '' ? 'Umum' : cat;
              return norm === folder;
            }).length;
            
            return (
              <div 
                key={folder} 
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all relative group cursor-pointer border-l-4 border-l-blue-500"
                onClick={() => { setActiveFolder(folder); setSelectedQuestions([]); }}
              >
                {folder !== 'Umum' && (
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => { setSelectedFolderToRename(folder); setRenameFolderInput(folder); setShowRenameFolderModal(true); }}
                      className="p-1 text-slate-400 hover:text-blue-500 rounded-md hover:bg-slate-50 transition-colors"
                      title="Ubah Nama Folder"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteFolder(folder)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-slate-50 transition-colors"
                      title="Hapus Folder & Soal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="mb-4">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-xl w-fit">
                    <Folder className="w-6 h-6 fill-blue-100 text-blue-500" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-indigo-950 text-sm line-clamp-1">{folder}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{count} Soal</p>
                </div>
              </div>
            );
          })}
          
          <div 
            onClick={() => setShowCreateFolderModal(true)}
            className="border-2 border-dashed border-slate-200 p-5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-950 transition-all group min-h-[140px]"
          >
            <div className="bg-slate-50 text-slate-400 p-3 rounded-xl group-hover:bg-indigo-950 group-hover:text-white transition-all mb-3">
              <FolderPlus className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-950 transition-colors">Buat Folder Baru</span>
          </div>
        </div>
      ) : (
        /* Questions List View (Inside Folder or searching globally) */
        <>
          {filteredQuestions.length > 0 && (
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 mb-4 shadow-sm">
              <label className="flex items-center gap-2.5 text-xs font-bold text-indigo-950 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={filteredQuestions.length > 0 && filteredQuestions.every(q => selectedQuestions.includes(q.id))}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-indigo-950 rounded cursor-pointer shrink-0"
                />
                <span>Pilih Semua Soal ({filteredQuestions.length})</span>
              </label>
              {activeFolder !== null ? (
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Folder: {activeFolder}</span>
              ) : (
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Hasil Pencarian Global</span>
              )}
            </div>
          )}

          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 sm:p-20 text-center border border-slate-100 border-dashed">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-indigo-950">Tidak Ada Soal</h3>
              <p className="text-slate-400 mt-2 max-w-sm mx-auto text-sm font-medium">
                {isSearching 
                  ? 'Tidak ada soal yang cocok dengan pencarian Anda.' 
                  : 'Folder ini kosong. Tambahkan soal baru atau impor soal untuk mengisi folder ini.'}
              </p>
              {activeFolder !== null && !isSearching && (
                <button 
                  onClick={() => {
                    setNewQuestion(prev => ({ ...prev, category: (activeFolder === 'Umum' ? '' : activeFolder) || '' }));
                    setShowAddModal(true);
                  }}
                  className="mt-6 bg-indigo-950 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-900 transition-all inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" /> Tambah Soal Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredQuestions.map((q) => {
                  const isSelected = selectedQuestions.includes(q.id);
                  return (
                    <motion.div 
                      layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      key={q.id} 
                      className={cn(
                        "bg-white p-4 sm:p-5 rounded-2xl border transition-all flex flex-col hover:shadow-xl relative",
                        isSelected ? "border-indigo-500 bg-indigo-50/10" : "border-slate-100 shadow-sm"
                      )}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectQuestion(q.id)}
                            className="w-4 h-4 accent-indigo-950 cursor-pointer rounded border-slate-200"
                          />
                          <div className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                            {q.category || 'Umum'}
                          </div>
                        </div>
                        <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-indigo-950 font-bold text-sm sm:text-base mb-4 line-clamp-2">{q.text}</p>
                      {q.image_url && (
                        <div className="mb-4 rounded-xl overflow-hidden max-h-32 border border-slate-100 bg-slate-50/50">
                          <img src={q.image_url} alt="Attachment" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{q.type}</span>
                        <button 
                          onClick={() => openEditModal(q)}
                          className="text-blue-600 font-bold text-[11px] flex items-center gap-1 hover:underline bg-transparent border-none cursor-pointer outline-none"
                        >
                          Edit Detail <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {selectedQuestions.length > 0 && (
        /* Floating selection action bar */
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigo-950/95 backdrop-blur text-white px-5 py-3.5 rounded-2xl flex items-center gap-5 shadow-2xl z-40 border border-white/10 shrink-0 max-w-[90vw] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-xs font-bold shrink-0">{selectedQuestions.length} soal terpilih</span>
          <div className="w-px h-5 bg-white/20 shrink-0" />
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => { setTargetBatchMoveFolder(foldersList[0]); setShowBatchMoveModal(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Pindahkan
            </button>
            <button 
              onClick={handleBatchDelete}
              className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Hapus
            </button>
            <button 
              onClick={() => setSelectedQuestions([])}
              className="bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Batal
            </button>
          </div>
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

      {showTemplateModal && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-indigo-950 text-sm">Unduh Template Soal</h3>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Pilih format dokumen template yang ingin diunduh:</p>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button 
                onClick={() => { downloadTemplate(); setShowTemplateModal(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left group"
              >
                <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-950">Template Excel</p>
                  <p className="text-[9px] text-slate-400">Format file spreadsheet .xlsx</p>
                </div>
              </button>
              
              <a 
                href="/Template_Bank_Soal_EduTest.docx" download
                onClick={() => setShowTemplateModal(false)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left group no-underline"
              >
                <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-950">Template Word</p>
                  <p className="text-[9px] text-slate-400">Format file dokumen teks .docx</p>
                </div>
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showImportModal && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-indigo-950 text-sm">Impor Soal Baru</h3>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Pilih format dokumen file soal yang akan diunggah:</p>
            
            {/* Toggle Auto-Detect Category */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80 flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold text-indigo-950">Deteksi Folder Otomatis</p>
                <p className="text-[9px] text-slate-400 leading-normal mt-0.5">
                  {autoDetectCategory 
                    ? "Membaca kolom/baris Kategori dari berkas impor untuk membuat folder."
                    : `Menyimpan semua soal impor ke folder aktif saat ini (${activeFolder || 'Umum'}).`
                  }
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  checked={autoDetectCategory}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAutoDetectCategory(val);
                    localStorage.setItem('edu_auto_detect_category', String(val));
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-950"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button 
                onClick={() => { excelInputRef.current?.click(); setShowImportModal(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left group"
              >
                <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-950">Impor dari Excel</p>
                  <p className="text-[9px] text-slate-400">Unggah berkas spreadsheet .xlsx/.xls</p>
                </div>
              </button>
              
              <button 
                onClick={() => { wordInputRef.current?.click(); setShowImportModal(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left group"
              >
                <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-950">Impor dari Word</p>
                  <p className="text-[9px] text-slate-400">Unggah berkas dokumen teks .docx</p>
                </div>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showCreateFolderModal && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-blue-500" /> Buat Folder Baru
              </h3>
              <button onClick={() => setShowCreateFolderModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Folder (Mapel/Materi)</label>
              <input 
                type="text"
                placeholder="Contoh: Fisika UTBK, Kimia XI, dll."
                value={newFolderNameInput}
                onChange={e => setNewFolderNameInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-950 text-xs font-bold text-indigo-950"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCreateFolderModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 text-xs bg-white">
                Batal
              </button>
              <button 
                onClick={() => handleCreateFolder(newFolderNameInput)}
                disabled={!newFolderNameInput.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-950 text-white font-bold text-xs disabled:opacity-50"
              >
                Buat Folder
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showRenameFolderModal && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-500" /> Ubah Nama Folder
              </h3>
              <button onClick={() => { setShowRenameFolderModal(false); setSelectedFolderToRename(null); }} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Folder Baru</label>
              <input 
                type="text"
                placeholder="Contoh: Matematika Peminatan"
                value={renameFolderInput}
                onChange={e => setRenameFolderInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-950 text-xs font-bold text-indigo-950"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowRenameFolderModal(false); setSelectedFolderToRename(null); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 text-xs bg-white">
                Batal
              </button>
              <button 
                onClick={() => selectedFolderToRename && handleRenameFolder(selectedFolderToRename, renameFolderInput)}
                disabled={!renameFolderInput.trim() || renameFolderInput.trim() === selectedFolderToRename}
                className="flex-1 py-2.5 rounded-xl bg-indigo-950 text-white font-bold text-xs disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showBatchMoveModal && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-100"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-500" /> Pindahkan {selectedQuestions.length} Soal
              </h3>
              <button onClick={() => setShowBatchMoveModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Folder Tujuan</label>
              <select
                value={targetBatchMoveFolder}
                onChange={e => setTargetBatchMoveFolder(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-950 text-xs font-bold text-indigo-950 bg-slate-50 cursor-pointer"
              >
                {foldersList.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowBatchMoveModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 text-xs bg-white">
                Batal
              </button>
              <button 
                onClick={() => handleBatchMove(targetBatchMoveFolder)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-950 text-white font-bold text-xs"
              >
                Pindahkan Soal
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
