import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  BookOpen, 
  Clock, 
  CheckCircle2,
  ChevronRight,
  LayoutGrid,
  Zap,
  Check,
  Plus,
  Trash2,
  Link as LinkIcon,
  FolderOpen,
  X,
  Loader2,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useRef } from 'react';
import { useAlert } from '../context/AlertContext';
import { generateExamCode, cn } from '../lib/utils';
import { useGoogleDrive } from '../context/GoogleDriveContext';
import { 
  saveJsonToDrive, 
  getOrCreateRootFolder, 
  setAccessToken, 
  makeFilePublic,
  uploadFileToDrive,
  getFileUrl
} from '../lib/googleDrive';
import { getCollectionData, saveCollection } from '../lib/db';
import { useSchool } from '../context/SchoolContext';

export default function BuatUjian() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { activeSchool } = useSchool();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    duration: 60,
    randomized: true,
    strict_mode: true,
    show_score: true,
    targetClasses: [] as string[]
  });
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [classesData] = await Promise.all([
        getCollectionData('classes', activeSchool?.id),
      ]);
      setClasses(classesData);
    };
    fetchData();
  }, [activeSchool?.id]);

  const toggleClass = (id: string) => {
    const current = formData.targetClasses;
    if (current.includes(id)) {
      setFormData({ ...formData, targetClasses: current.filter(cid => cid !== id) });
    } else {
      setFormData({ ...formData, targetClasses: [...current, id] });
    }
  };

  const toggleAllClasses = () => {
    if (formData.targetClasses.length === classes.length) {
      setFormData({ ...formData, targetClasses: [] });
    } else {
      setFormData({ ...formData, targetClasses: classes.map(c => c.id) });
    }
  };

  const [questions, setQuestions] = useState<any[]>([]);

  const [showBankModal, setShowBankModal] = useState(false);
  const [bankSoal, setBankSoal] = useState<any[]>([]);
  const [selectedBankSoal, setSelectedBankSoal] = useState<string[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);

  const openBankModal = async () => {
    setLoadingBank(true);
    setShowBankModal(true);
    const data = await getCollectionData('bank_soal');
    setBankSoal(data);
    setLoadingBank(false);
  };

  const addFromBankSoal = () => {
    const selected = bankSoal.filter(q => selectedBankSoal.includes(q.id));
    if (selected.length === 0) return;
    
    const newQuestions = selected.map((q, idx) => {
      const type = q.type || 'Pilihan Ganda';
      let options: any[] = [];
      if (type !== 'Essay') {
        options = [
          { id: 'a', text: q.option_a || '', label: 'A' },
          { id: 'b', text: q.option_b || '', label: 'B' },
          { id: 'c', text: q.option_c || '', label: 'C' },
          { id: 'd', text: q.option_d || '', label: 'D' },
          { id: 'e', text: q.option_e || '', label: 'E' }
        ];
      }
      return {
        id: `bank_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        question_text: q.text || '',
        question_type: type,
        options,
        correct_answer: q.jawaban_benar || 'a'
      };
    });
    
    setQuestions([...questions, ...newQuestions]);
    setShowBankModal(false);
    setSelectedBankSoal([]);
  };

  const toggleBankSoal = (id: string) => {
    if (selectedBankSoal.includes(id)) {
      setSelectedBankSoal(selectedBankSoal.filter(s => s !== id));
    } else {
      setSelectedBankSoal([...selectedBankSoal, id]);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      id: Date.now().toString(),
      question_text: '',
      question_type: 'Pilihan Ganda',
      options: [
        { id: 'a', text: '', label: 'A' },
        { id: 'b', text: '', label: 'B' },
        { id: 'c', text: '', label: 'C' },
        { id: 'd', text: '', label: 'D' },
        { id: 'e', text: '', label: 'E' }
      ],
      correct_answer: 'a'
    }]);
  };

  const handleQuestionTypeChange = (id: string, type: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== id) return q;
      
      let newOptions = [...(q.options || [])];
      let correct_answer = q.correct_answer;
      
      if (type === 'Pilihan Ganda Asosiatif (TKA)') {
        newOptions = [
          { id: 'a', text: '1, 2, dan 3 benar', label: 'A' },
          { id: 'b', text: '1 dan 3 benar', label: 'B' },
          { id: 'c', text: '2 dan 4 benar', label: 'C' },
          { id: 'd', text: 'Hanya 4 yang benar', label: 'D' },
          { id: 'e', text: 'Semua pernyataan benar', label: 'E' }
        ];
        correct_answer = 'a';
      } else if (type === 'Hubungan Sebab Akibat (TKA)') {
        newOptions = [
          { id: 'a', text: 'Pernyataan benar, alasan benar, dan keduanya menunjukkan hubungan sebab akibat', label: 'A' },
          { id: 'b', text: 'Pernyataan benar, alasan benar, tetapi keduanya tidak menunjukkan hubungan sebab akibat', label: 'B' },
          { id: 'c', text: 'Pernyataan benar dan alasan salah', label: 'C' },
          { id: 'd', text: 'Pernyataan salah dan alasan benar', label: 'D' },
          { id: 'e', text: 'Pernyataan dan alasan keduanya salah', label: 'E' }
        ];
        correct_answer = 'a';
      } else if (type === 'Pilihan Ganda') {
        const isTkaAsosiatif = (q.options || []).some((o: any) => o.text === '1, 2, dan 3 benar');
        const isTkaSebabAkibat = (q.options || []).some((o: any) => o.text && o.text.includes('Pernyataan benar, alasan benar'));
        
        if (isTkaAsosiatif || isTkaSebabAkibat || q.question_type === 'Essay') {
          newOptions = [
            { id: 'a', text: '', label: 'A' },
            { id: 'b', text: '', label: 'B' },
            { id: 'c', text: '', label: 'C' },
            { id: 'd', text: '', label: 'D' },
            { id: 'e', text: '', label: 'E' }
          ];
        }
      } else if (type === 'Essay') {
        newOptions = [];
        correct_answer = '';
      }

      return {
        ...q,
        question_type: type,
        options: newOptions,
        correct_answer
      };
    }));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleUploadQuestionImage = async (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showAlert({ title: 'Gagal', message: 'Ukuran gambar terlalu besar (Maks 2MB)', type: 'warning' });
      return;
    }

    try {
      setUploadingQuestionId(questionId);
      const folderId = await getOrCreateRootFolder();
      const fileId = await uploadFileToDrive(file, folderId) as string;
      const url = getFileUrl(fileId);
      
      updateQuestion(questionId, 'image_url', url);
      showAlert({ title: 'Berhasil', message: 'Gambar berhasil diupload.', type: 'success' });
    } catch (err) {
      console.error('Upload error:', err);
      showAlert({ title: 'Gagal', message: 'Gagal mengupload gambar ke Drive.', type: 'error' });
    } finally {
      setUploadingQuestionId(null);
      if (fileInputRefs.current[questionId]) fileInputRefs.current[questionId]!.value = '';
    }
  };

  const handleCreateExam = async () => {
    if (!formData.title?.trim()) {
      showAlert({ title: 'Peringatan', message: 'Judul ujian wajib diisi!', type: 'warning' });
      return;
    }

    if (questions.length === 0) {
      showAlert({ title: 'Peringatan', message: 'Belum ada soal. Tambahkan soal terlebih dahulu!', type: 'warning' });
      return;
    }
    
    const filledQuestions = questions.filter(q => q.question_text && q.question_text.trim());
    if (filledQuestions.length === 0) {
      showAlert({ title: 'Peringatan', message: 'Isi teks pertanyaan minimal 1 soal!', type: 'warning' });
      return;
    }

    setLoading(true);

    try {
      const examId = generateExamCode();
      
      // Use folder from context OR get/create new one if null
      let folderId: string | null = null;
      if (!folderId) {
        const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
        const eduToken = localStorage.getItem('edu_token');
        const token = eduToken || session.user?.token;
        
        if (token) {
          setAccessToken(token);
          folderId = await getOrCreateRootFolder();
        }
      }
      
      if (!folderId) {
        showAlert({ title: 'Error', message: 'Gagal mengakses Google Drive. Silakan login ulang.', type: 'error' });
        setLoading(false);
        return;
      }

      // Fetch allowed students for this exam based on targetClasses
      const [allStudents, allClasses] = await Promise.all([
        getCollectionData('students'),
        getCollectionData('classes')
      ]);
      
      const allowedStudents = allStudents
        .filter((s: any) => formData.targetClasses.includes(s.classId))
        .map((s: any) => ({
          ...s,
          className: allClasses.find((c: any) => c.id === s.classId)?.name || 'Umum'
        }));

      console.log('Sync Check:', { allCount: allStudents.length, target: formData.targetClasses, allowed: allowedStudents.length });

      if (allowedStudents.length === 0 && formData.targetClasses.length > 0) {
        const proceed = window.confirm('Peringatan: Tidak ada siswa ditemukan untuk kelas yang dipilih. Kode unik tidak akan berfungsi. Lanjutkan tetap terbitkan?');
        if (!proceed) {
          setLoading(false);
          return;
        }
      }

      // Strip correct_answer from questions for student-visible payload
      const safeQuestions = questions.map(q => ({
        ...q,
        correct_answer: undefined
      }));

      const teacherProfile = JSON.parse(localStorage.getItem('edu_profile') || '{}');
      const examPayload = {
        ...formData,
        serverUrl: teacherProfile.serverUrl,
        id: examId,
        questions: safeQuestions,
        _answer_key: questions.map(q => ({ id: q.id, answer: q.correct_answer })),
        allowedStudents,
        folderId: folderId,
        created_at: new Date().toISOString()
      };

      const fileName = `soal_${examId}.json`;
      const result = await saveJsonToDrive(folderId, fileName, examPayload);
      console.log('Exam saved:', result);

      // Auto-Public: Set permission so anyone with link can read
      if (result.id) {
        await makeFilePublic(result.id);
        console.log('Exam file is now public');
        await saveCollection('exam_' + result.id, examPayload);
      }

      // Update global exams list via IndexedDB
      const savedExams = await getCollectionData('exams_list');
      const newExamMeta = {
        id: examId,
        driveFileId: result.id,
        title: formData.title,
        duration: formData.duration,
        totalQuestions: questions.length,
        folderId: folderId, // ADDED THIS
        createdAt: new Date().toISOString()
      };
      
      const updatedExams = [newExamMeta, ...savedExams];
      await saveCollection('exams_list', updatedExams);
      await saveJsonToDrive(folderId, 'exams_list.json', updatedExams);
      
      // result.id is the Google Drive File ID
      const sessionData = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const teacherId = sessionData.user?.id || 'anonymous';
      
      const shareUrl = `${window.location.origin}/test/${teacherId}/${result.id}`;
      setGeneratedLink(shareUrl);
      setStep(3);

      showAlert({
        title: 'Berhasil!',
        message: `Ujian berhasil disimpan ke Google Drive.`,
        type: 'success'
      });
    } catch (error) {
      console.error(error);
      showAlert({
        title: 'Gagal',
        message: 'Gagal menyimpan ke Google Drive.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, label: 'Pengaturan', icon: Settings },
    { id: 2, label: 'Soal', icon: BookOpen },
    { id: 3, label: 'Selesai', icon: CheckCircle2 }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="tracking-tight">Buat Ujian Baru</h2>
          <p className="text-slate-500 text-sm font-medium">Selesaikan 3 langkah untuk merilis ujian dan simpan ke Cloud.</p>
        </div>
        {step < 3 && (
          <button 
            onClick={handleCreateExam}
            disabled={loading}
            className="w-full sm:w-auto bg-indigo-950 text-white px-5 py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200 text-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Simpan & Terbitkan</>}
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-md",
                step >= s.id ? "bg-indigo-950 text-white" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                step >= s.id ? "text-indigo-950" : "text-slate-300"
              )}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className="h-0.5 w-8 sm:w-12 bg-slate-100 rounded-full" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"
          >
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700">Judul Ujian</label>
              <input 
                type="text" placeholder="Contoh: UTS Matematika Kelas XII"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 font-bold text-indigo-950 text-sm"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Target Kelas</label>
                <button 
                  type="button" onClick={toggleAllClasses}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700"
                >
                  {formData.targetClasses.length === classes.length ? 'Hapus Semua' : 'Pilih Semua'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {classes.map(c => (
                  <button
                    key={c.id} type="button"
                    onClick={() => toggleClass(c.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                      formData.targetClasses.includes(c.id)
                        ? "bg-indigo-950 text-white border-indigo-950 shadow-md"
                        : "bg-white text-slate-500 border-slate-200 hover:border-indigo-950"
                    )}
                  >
                    {c.name}
                  </button>
                ))}
                {classes.length === 0 && (
                  <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 italic">
                    Belum ada kelas. Silakan buat di menu Kelola Kelas.
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Durasi (Menit)</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input 
                    type="number" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/10 text-sm font-bold"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <LayoutGrid className="text-indigo-950 w-4 h-4" />
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-indigo-950">Acak Soal</p>
                  <p className="text-[9px] text-slate-500">Urutan soal berbeda.</p>
                </div>
                <input 
                  type="checkbox" checked={formData.randomized}
                  onChange={(e) => setFormData({...formData, randomized: e.target.checked})}
                  className="w-4 h-4 accent-indigo-950"
                />
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              className="w-full bg-indigo-950 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
            >
              Lanjut ke Daftar Soal <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="bg-indigo-950/5 p-3 rounded-xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-950 text-white p-1.5 rounded-lg">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-bold text-indigo-950">{questions.length} Soal Ditambahkan</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={openBankModal} className="flex-1 sm:flex-none bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-blue-700">
                  <FolderOpen className="w-3.5 h-3.5" /> Bank Soal
                </button>
                <button onClick={addQuestion} className="flex-1 sm:flex-none bg-white text-indigo-950 px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm border border-slate-100 flex items-center justify-center gap-2 hover:bg-slate-50">
                  <Plus className="w-3.5 h-3.5" /> Manual
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 relative group">
                  <button 
                    onClick={() => removeQuestion(q.id)}
                    className="absolute top-5 right-5 p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest w-fit">SOAL #{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipe Soal:</span>
                      <select
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 outline-none font-bold text-[10px] text-indigo-950 cursor-pointer"
                        value={q.question_type || 'Pilihan Ganda'}
                        onChange={(e) => handleQuestionTypeChange(q.id, e.target.value)}
                      >
                        <option value="Pilihan Ganda">Pilihan Ganda (5 Opsi)</option>
                        <option value="Pilihan Ganda Asosiatif (TKA)">Pilihan Ganda Asosiatif (TKA)</option>
                        <option value="Hubungan Sebab Akibat (TKA)">Hubungan Sebab Akibat (TKA)</option>
                        <option value="Essay">Essay</option>
                      </select>
                    </div>
                  </div>
                  <textarea 
                    placeholder="Masukkan pertanyaan di sini..."
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/10 min-h-[80px] font-medium text-sm"
                    value={q.question_text}
                    onChange={(e) => updateQuestion(q.id, 'question_text', e.target.value)}
                  />
                  
                  {/* Image Input */}
                  <div className="space-y-2">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={el => fileInputRefs.current[q.id] = el}
                      onChange={(e) => handleUploadQuestionImage(e, q.id)}
                    />
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Link Gambar / Diagram (Opsional)..."
                          className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold text-indigo-950 placeholder:text-slate-400 truncate"
                          value={q.image_url || ''}
                          onChange={(e) => updateQuestion(q.id, 'image_url', e.target.value)}
                        />
                      </div>
                      <button 
                        type="button"
                        disabled={uploadingQuestionId === q.id}
                        onClick={() => fileInputRefs.current[q.id]?.click()}
                        className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-[10px] flex items-center gap-1.5 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                      >
                        {uploadingQuestionId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {uploadingQuestionId === q.id ? 'Proses' : 'Pilih File'}
                      </button>
                    </div>
                  </div>
                  {q.image_url && (
                      <div className="relative w-full max-h-40 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img src={q.image_url} alt="Preview" className="w-full h-full object-contain" />
                        <button 
                          onClick={() => updateQuestion(q.id, 'image_url', '')}
                          className="absolute top-2 right-2 bg-white/80 backdrop-blur p-1.5 rounded-lg shadow-sm border border-slate-200"
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    )}
                  
                  {q.question_type !== 'Essay' && q.options && q.options.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opsi Jawaban & Kunci</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt: any) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <button 
                              onClick={() => updateQuestion(q.id, 'correct_answer', opt.id)}
                              className={cn(
                                "w-8 h-8 rounded-lg font-bold flex items-center justify-center border-2 transition-all text-xs shrink-0",
                                q.correct_answer === opt.id ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-100 text-slate-300"
                              )}
                            >
                              {opt.label}
                            </button>
                            <input 
                              type="text" placeholder={`Pilihan ${opt.label}`}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-100 outline-none focus:border-blue-300 text-xs font-medium"
                              value={opt.text}
                              onChange={(e) => {
                                const newOptions = q.options.map((o: any) => o.id === opt.id ? { ...o, text: e.target.value } : o);
                                updateQuestion(q.id, 'options', newOptions);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.question_type === 'Essay' && (
                    <p className="text-[11px] text-slate-400 font-bold bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 italic">
                      Tipe Essay tidak memerlukan opsi jawaban maupun kunci jawaban pilihan ganda.
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-white border border-slate-200 text-slate-500 py-3 rounded-xl font-bold text-sm">Kembali</button>
              <button onClick={handleCreateExam} disabled={loading} className="flex-[2] bg-indigo-950 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-xl shadow-indigo-950/20">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Terbitkan Ujian</>}
              </button>
            </div>
          </motion.div>
        )}

        {showBankModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-indigo-950">Pilih dari Bank Soal</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedBankSoal.length} terpilih</p>
                  </div>
                </div>
                <button onClick={() => { setShowBankModal(false); setSelectedBankSoal([]); }} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingBank ? (
                  <div className="text-center py-10 text-slate-400 text-sm">Memuat Bank Soal...</div>
                ) : bankSoal.length === 0 ? (
                  <div className="text-center py-10">
                    <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">Bank soal kosong.</p>
                  </div>
                ) : (
                  bankSoal.map((q) => (
                    <div 
                      key={q.id}
                      onClick={() => toggleBankSoal(q.id)}
                      className={cn(
                        "p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3",
                        selectedBankSoal.includes(q.id) 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0",
                        selectedBankSoal.includes(q.id) ? "bg-blue-500 border-blue-500" : "border-slate-200"
                      )}>
                        {selectedBankSoal.includes(q.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-indigo-950 text-xs line-clamp-1">{q.text}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{q.category || 'Umum'} &bull; {q.type}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 flex gap-2">
                <button onClick={() => { setShowBankModal(false); setSelectedBankSoal([]); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-500 text-xs">
                  Batal
                </button>
                <button onClick={addFromBankSoal} disabled={selectedBankSoal.length === 0} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs disabled:opacity-50">
                  Tambah {selectedBankSoal.length} Soal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-100 shadow-xl text-center space-y-6"
          >
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-indigo-950 tracking-tight">Ujian Berhasil Diterbitkan!</h3>
              <p className="text-slate-500 text-sm mt-1">Salin link di bawah ini dan bagikan ke siswa Anda.</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="bg-indigo-950 p-1.5 rounded-lg shrink-0">
                <LinkIcon className="text-white w-3.5 h-3.5" />
              </div>
              <input readOnly value={generatedLink} className="bg-transparent border-none outline-none flex-1 text-xs font-mono text-indigo-950 overflow-x-auto" />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  showAlert({ title: 'Disalin!', message: 'Link ujian telah disalin ke clipboard.', type: 'success' });
                }}
                className="text-indigo-950 font-black text-[10px] uppercase tracking-widest px-2.5 py-1.5 bg-white rounded-lg shadow-sm border border-slate-200"
              >
                Salin
              </button>
            </div>
            <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm">Kembali ke Dashboard</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
