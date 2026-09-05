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
  Upload,
  Shuffle,
  ShieldAlert,
  KeyRound,
  GraduationCap,
  FileText,
  Calendar,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useRef } from 'react';
import { useAlert } from '../context/AlertContext';
import { generateExamCode, cn } from '../lib/utils';
import { getCollectionData, saveCollection } from '../lib/db';
import { useSchool } from '../context/SchoolContext';
import { uploadQuestionImage } from '../lib/cloudinary';
import { ALL_SCHOOL_SUBJECTS } from './BankSoal';
import { CLASSES_LIST } from '../lib/seedAccounts';

export default function BuatUjian() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { activeSchool } = useSchool();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
  const userRole = session?.user?.role || 'guru';
  const isSuperAdmin = userRole === 'superadmin';
  const rawMataPelajaran: string = session?.user?.mata_pelajaran || '';
  const teacherSubjects: string[] = rawMataPelajaran
    ? rawMataPelajaran.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const [formData, setFormData] = useState({
    title: '',
    subject: teacherSubjects[0] || '',
    exam_type: (isSuperAdmin ? 'semester' : 'harian') as 'semester' | 'harian',
    targetGrade: 'ALL',
    session_name: 'Sesi 1',
    start_time: '07:30',
    end_time: '09:30',
    room_capacity: 20,
    duration: 60,
    randomized: true,
    randomize_options: false,
    anti_cheat: false,
    cheat_tolerance: 3,
    unlock_code: '',
    strict_mode: true,
    show_score: true,
    targetClasses: [] as string[]
  });
  const [classes, setClasses] = useState<any[]>(CLASSES_LIST);
  const [classSearch, setClassSearch] = useState('');
  const [selectedGradeTab, setSelectedGradeTab] = useState<'ALL' | 'X' | 'XI' | 'XII'>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      let classesData = await getCollectionData('classes', activeSchool?.id);
      if (!classesData || classesData.length === 0) {
        classesData = CLASSES_LIST;
        try {
          await saveCollection('classes', CLASSES_LIST);
        } catch {}
      } else if (classesData.length < CLASSES_LIST.length) {
        // Ensure all seed classes (X-A through XII-J) are available in the list
        const existingIds = new Set(classesData.map((c: any) => c.id || c.name));
        const merged = [...classesData];
        CLASSES_LIST.forEach((seedCls) => {
          if (!existingIds.has(seedCls.id) && !existingIds.has(seedCls.name)) {
            merged.push(seedCls);
          }
        });
        classesData = merged;
      }
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

  const selectGradeClasses = (grade: 'ALL' | 'X' | 'XI' | 'XII') => {
    if (grade === 'ALL') {
      setFormData(prev => ({ ...prev, targetGrade: 'ALL', targetClasses: classes.map(c => c.id) }));
      return;
    }
    const matched = classes.filter(c => {
      const t = (c.tingkat || '').toUpperCase();
      const n = (c.name || c.nama_kelas || '').toUpperCase();
      if (grade === 'X') return t === 'X' || n.startsWith('X-') || n.startsWith('X ') || n.startsWith('X');
      if (grade === 'XI') return t === 'XI' || n.startsWith('XI-') || n.startsWith('XI ') || n.startsWith('XI');
      if (grade === 'XII') return t === 'XII' || n.startsWith('XII-') || n.startsWith('XII ') || n.startsWith('XII');
      return false;
    });
    setFormData(prev => ({
      ...prev,
      targetGrade: grade,
      targetClasses: matched.map(c => c.id)
    }));
  };

  const toggleGradeGroup = (gradeKey: 'X' | 'XI' | 'XII') => {
    const gradeClasses = classes.filter(c => {
      const t = (c.tingkat || '').toUpperCase();
      const n = (c.name || c.nama_kelas || '').toUpperCase();
      if (gradeKey === 'X') return t === 'X' || n.startsWith('X-') || n.startsWith('X ');
      if (gradeKey === 'XI') return t === 'XI' || n.startsWith('XI-') || n.startsWith('XI ');
      if (gradeKey === 'XII') return t === 'XII' || n.startsWith('XII-') || n.startsWith('XII ') || n.startsWith('XII');
      return false;
    });
    const gradeIds = gradeClasses.map(c => c.id);
    const allSelected = gradeIds.length > 0 && gradeIds.every(id => formData.targetClasses.includes(id));

    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        targetClasses: prev.targetClasses.filter(id => !gradeIds.includes(id))
      }));
    } else {
      const set = new Set([...formData.targetClasses, ...gradeIds]);
      setFormData(prev => ({
        ...prev,
        targetClasses: Array.from(set)
      }));
    }
  };

  const getTabClasses = (tab: 'ALL' | 'X' | 'XI' | 'XII') => {
    return classes.filter(c => {
      const t = (c.tingkat || '').toUpperCase();
      const n = (c.name || c.nama_kelas || '').toUpperCase();
      if (tab === 'X') return t === 'X' || n.startsWith('X-') || n.startsWith('X ') || n.startsWith('X');
      if (tab === 'XI') return t === 'XI' || n.startsWith('XI-') || n.startsWith('XI ') || n.startsWith('XI');
      if (tab === 'XII') return t === 'XII' || n.startsWith('XII-') || n.startsWith('XII ') || n.startsWith('XII');
      return true;
    });
  };

  const toggleCurrentTabClasses = () => {
    const tabClasses = getTabClasses(selectedGradeTab);
    const tabIds = tabClasses.map(c => c.id);
    const allTabChecked = tabIds.length > 0 && tabIds.every(id => formData.targetClasses.includes(id));

    if (allTabChecked) {
      setFormData(prev => ({
        ...prev,
        targetClasses: prev.targetClasses.filter(id => !tabIds.includes(id))
      }));
    } else {
      const set = new Set([...formData.targetClasses, ...tabIds]);
      setFormData(prev => ({
        ...prev,
        targetClasses: Array.from(set)
      }));
    }
  };

  const clearAllClasses = () => {
    setFormData(prev => ({ ...prev, targetGrade: 'CUSTOM', targetClasses: [] }));
  };

  const handleNextToStep2 = () => {
    if (!formData.title?.trim()) {
      showAlert({ title: 'Perhatian', message: 'Silakan isi judul ujian terlebih dahulu!', type: 'warning' });
      return;
    }
    if (formData.targetClasses.length === 0) {
      showAlert({ title: 'Perhatian', message: 'Silakan centang minimal 1 kelas target peserta ujian!', type: 'warning' });
      return;
    }
    setStep(2);
  };

  const [questions, setQuestions] = useState<any[]>([]);

  const [showBankModal, setShowBankModal] = useState(false);
  const [bankSoal, setBankSoal] = useState<any[]>([]);
  const [selectedBankSoal, setSelectedBankSoal] = useState<string[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);

  const openBankModal = async () => {
    setLoadingBank(true);
    setShowBankModal(true);
    let data = await getCollectionData('bank_soal');
    if (!data || data.length === 0) {
      try {
        const res = await fetch('/seed_bank_soal.json');
        if (res.ok) {
          data = await res.json();
          await saveCollection('bank_soal', data);
        }
      } catch {}
    }
    const normalized = (data || []).map((q: any) => ({
      ...q,
      jenjang: q.jenjang || 'X'
    }));
    let customFolders: string[] = [];
    try {
      const stored = await getCollectionData('bank_soal_custom_folders');
      if (stored && Array.isArray(stored)) {
        customFolders = stored.map((f: any) => typeof f === 'string' ? f : f.name).filter(Boolean);
      } else {
        const localStr = localStorage.getItem('edu_custom_folders');
        if (localStr) customFolders = JSON.parse(localStr);
      }
    } catch {}

    if (!isSuperAdmin && teacherSubjects.length > 0) {
      const filtered = normalized.filter((q: any) => {
        const cat = (q.category || '').toLowerCase().trim();
        const matchSubject = teacherSubjects.some(ts => cat.includes(ts.toLowerCase()) || ts.toLowerCase().includes(cat));
        const matchCustom = customFolders.some((cf: string) => cat.includes(cf.toLowerCase()) || cf.toLowerCase().includes(cat));
        return matchSubject || matchCustom;
      });
      setBankSoal(filtered);
    } else {
      setBankSoal(normalized);
    }
    setLoadingBank(false);
  };

  const addFromBankSoal = () => {
    const selected = bankSoal.filter(q => selectedBankSoal.includes(q.id));
    if (selected.length === 0) return;
    
    const newQuestions = selected.map((q, idx) => {
      const type = q.type || 'Pilihan Ganda';
      let options: any[] = [];
      let correct_answer = q.jawaban_benar || 'a';

      if (type === 'Pilihan Ganda' || type === 'Pilihan Ganda Asosiatif (TKA)' || type === 'Hubungan Sebab Akibat (TKA)' || type === 'Pilihan Ganda Kompleks') {
        options = [
          { id: 'a', text: q.option_a || '', label: 'A' },
          { id: 'b', text: q.option_b || '', label: 'B' },
          { id: 'c', text: q.option_c || '', label: 'C' },
          { id: 'd', text: q.option_d || '', label: 'D' },
          { id: 'e', text: q.option_e || '', label: 'E' }
        ];
      } else if (type === 'Menjodohkan') {
        options = [
          { id: 'a', text: q.option_a || '', label: '1' },
          { id: 'b', text: q.option_b || '', label: '2' },
          { id: 'c', text: q.option_c || '', label: '3' },
          { id: 'd', text: q.option_d || '', label: '4' },
          { id: 'e', text: q.option_e || '', label: '5' }
        ].filter(opt => opt.text && opt.text.trim());
        correct_answer = 'auto';
      } else if (type === 'Drag and Drop') {
        options = [
          { id: 'a', text: q.option_a || '', label: 'Tahap 1' },
          { id: 'b', text: q.option_b || '', label: 'Tahap 2' },
          { id: 'c', text: q.option_c || '', label: 'Tahap 3' },
          { id: 'd', text: q.option_d || '', label: 'Tahap 4' },
          { id: 'e', text: q.option_e || '', label: 'Tahap 5' }
        ].filter(opt => opt.text && opt.text.trim());
        correct_answer = q.jawaban_benar || 'a,b,c,d';
      } else if (type === 'Isian Singkat') {
        options = [];
        correct_answer = q.jawaban_benar || '';
      } else if (type === 'Essay') {
        options = [];
        correct_answer = '';
      }

      return {
        id: `bank_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        question_text: q.text || '',
        question_type: type,
        options,
        correct_answer,
        image_url: q.image_url || ''
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
      } else if (type === 'Pilihan Ganda' || type === 'Pilihan Ganda Kompleks') {
        const isPreset = (q.options || []).some((o: any) => o.text === '1, 2, dan 3 benar' || (o.text && o.text.includes('Pernyataan benar')));
        if (isPreset || !q.options || q.options.length === 0 || q.question_type === 'Essay' || q.question_type === 'Isian Singkat' || q.question_type === 'Menjodohkan') {
          newOptions = [
            { id: 'a', text: '', label: 'A' },
            { id: 'b', text: '', label: 'B' },
            { id: 'c', text: '', label: 'C' },
            { id: 'd', text: '', label: 'D' },
            { id: 'e', text: '', label: 'E' }
          ];
        }
        correct_answer = type === 'Pilihan Ganda Kompleks' ? 'a' : (correct_answer || 'a');
      } else if (type === 'Menjodohkan') {
        newOptions = [
          { id: 'a', text: 'Premis 1 = Pasangan 1', label: '1' },
          { id: 'b', text: 'Premis 2 = Pasangan 2', label: '2' },
          { id: 'c', text: 'Premis 3 = Pasangan 3', label: '3' },
          { id: 'd', text: 'Premis 4 = Pasangan 4', label: '4' }
        ];
        correct_answer = 'auto';
      } else if (type === 'Drag and Drop') {
        newOptions = [
          { id: 'a', text: 'Tahap 1 (Awal)', label: 'Tahap 1' },
          { id: 'b', text: 'Tahap 2', label: 'Tahap 2' },
          { id: 'c', text: 'Tahap 3', label: 'Tahap 3' },
          { id: 'd', text: 'Tahap 4 (Akhir)', label: 'Tahap 4' }
        ];
        correct_answer = 'a,b,c,d';
      } else if (type === 'Isian Singkat') {
        newOptions = [];
        correct_answer = '';
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
      const { url } = await uploadQuestionImage(file);
      updateQuestion(questionId, 'image_url', url);
      showAlert({ title: 'Berhasil', message: 'Gambar berhasil diupload.', type: 'success' });
    } catch (err) {
      console.error('Upload error:', err);
      showAlert({ title: 'Gagal', message: 'Gagal mengupload gambar.', type: 'error' });
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

    if (!formData.targetClasses || formData.targetClasses.length === 0) {
      showAlert({ title: 'Peringatan', message: 'Pilih minimal 1 kelas target peserta ujian!', type: 'warning' });
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
      const sessionData = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const teacherId = sessionData.user?.id || 'guru';
      const teacherName = sessionData.user?.name || sessionData.user?.nama || 'Guru Mata Pelajaran';

      // Fetch allowed students for this exam based on targetClasses
      const [allStudents, allClasses] = await Promise.all([
        getCollectionData('students'),
        classes.length > 0 ? Promise.resolve(classes) : getCollectionData('classes')
      ]);
      
      const targetClassNames = (allClasses || [])
        .filter((c: any) => formData.targetClasses.includes(c.id))
        .map((c: any) => (c.name || c.nama_kelas || '').toLowerCase().trim());

      const allowedStudents = (allStudents || [])
        .filter((s: any) => {
          if (formData.targetClasses.includes(s.classId)) return true;
          const sClass = (s.nama_kelas || s.kelas || '').toLowerCase().trim();
          return sClass && targetClassNames.includes(sClass);
        })
        .map((s: any) => ({
          ...s,
          className: (allClasses || []).find((c: any) => c.id === s.classId)?.name || s.nama_kelas || s.kelas || 'Umum'
        }));

      // Safe questions for students
      const safeQuestions = questions.map(q => ({
        ...q,
        correct_answer: undefined
      }));

      // Compute grade restriction accurately
      const selectedGradeSet = new Set(
        formData.targetClasses.map(cid => {
          const cls = (allClasses || []).find((c: any) => c.id === cid);
          const t = (cls?.tingkat || '').toUpperCase();
          const n = (cls?.name || cls?.nama_kelas || '').toUpperCase();
          if (t === 'XII' || n.startsWith('XII')) return 'XII';
          if (t === 'XI' || n.startsWith('XI')) return 'XI';
          if (t === 'X' || n.startsWith('X')) return 'X';
          return 'OTHER';
        })
      );
      const computedGrade = (formData.targetClasses.length === (allClasses || []).length && (allClasses || []).length > 0)
        ? 'ALL'
        : selectedGradeSet.size === 1
        ? Array.from(selectedGradeSet)[0]
        : 'CUSTOM';

      const examPayload = {
        ...formData,
        subject: formData.subject || teacherSubjects[0] || 'Informatika',
        id: examId,
        driveFileId: examId,
        teacher_id: teacherId,
        teacher_name: teacherName,
        status: 'active',
        is_active: true,
        targetGrade: computedGrade,
        targetClasses: formData.targetClasses,
        targetClassNames: (allClasses || [])
          .filter((c: any) => formData.targetClasses.includes(c.id))
          .map((c: any) => c.name || c.nama_kelas || c.id),
        questions: safeQuestions,
        _answer_key: questions.map(q => ({ id: q.id, answer: q.correct_answer })),
        allowedStudents,
        created_at: new Date().toISOString()
      };

      // Save locally
      await saveCollection('exam_' + examId, examPayload);

      // Save to Appwrite
      try {
        const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../lib/appwrite');
        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.EXAMS,
          examId,
          {
            title: formData.title,
            subject: formData.subject || teacherSubjects[0] || 'Informatika',
            duration: Number(formData.duration) || 60,
            status: 'active',
            driveFileId: examId,
            questions: JSON.stringify(examPayload).substring(0, 65000),
            unlock_code: formData.unlock_code || '',
            cheat_tolerance: Number(formData.cheat_tolerance) || 3
          }
        );
      } catch (sErr) {
        console.warn('Appwrite exam sync note:', sErr);
      }

      // Update global exams list via IndexedDB
      const targetClassLabels = (allClasses || [])
        .filter((c: any) => formData.targetClasses.includes(c.id))
        .map((c: any) => c.name || c.nama_kelas || c.id);

      const newExamMeta = {
        id: examId,
        driveFileId: examId,
        title: formData.title,
        subject: formData.subject || teacherSubjects[0] || 'Informatika',
        exam_type: formData.exam_type || 'semester',
        session_name: formData.session_name || 'Sesi 1',
        start_time: formData.start_time || '07:30',
        end_time: formData.end_time || '09:30',
        room_capacity: formData.room_capacity || 20,
        targetGrade: computedGrade,
        targetClasses: formData.targetClasses,
        targetClassNames: targetClassLabels,
        teacher_id: teacherId,
        teacher_name: teacherName,
        status: 'active',
        is_active: true,
        token: formData.unlock_code || '',
        duration: Number(formData.duration) || 60,
        duration_minutes: Number(formData.duration) || 60,
        totalQuestions: questions.length,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        randomized: formData.randomized,
        randomize_options: formData.randomize_options,
        anti_cheat: formData.anti_cheat,
        cheat_tolerance: formData.cheat_tolerance,
        unlock_code: formData.unlock_code,
        strict_mode: formData.strict_mode,
        show_score: formData.show_score
      };
      
      const savedExams = (await getCollectionData('exams_list')) || [];
      const updatedExams = [newExamMeta, ...savedExams.filter((e: any) => e.id !== examId)];
      await saveCollection('exams_list', updatedExams);

      // Also save to 'exams' collection for student portal dashboard compatibility
      const savedRawExams = (await getCollectionData('exams')) || [];
      const updatedRawExams = [newExamMeta, ...savedRawExams.filter((e: any) => e.id !== examId)];
      await saveCollection('exams', updatedRawExams);
      
      const shareUrl = `${window.location.origin}/test/${teacherId}/${examId}`;
      setGeneratedLink(shareUrl);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      showAlert({ title: 'Gagal', message: err.message || 'Terjadi kesalahan saat membuat ujian.', type: 'error' });
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
        {step === 1 && (
          <button 
            onClick={handleNextToStep2}
            className="w-full sm:w-auto bg-indigo-950 hover:bg-indigo-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/15 text-xs transition-all cursor-pointer"
          >
            <span>Lanjut ke Soal</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {step === 2 && (
          <button 
            onClick={handleCreateExam}
            disabled={loading}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 text-xs transition-all cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Terbitkan Ujian</>}
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 sm:gap-4">
            <div 
              onClick={() => {
                if (s.id === 1) setStep(1);
                if (s.id === 2) handleNextToStep2();
              }}
              className={cn("flex flex-col items-center gap-1.5", s.id < 3 && "cursor-pointer group")}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md",
                step === s.id ? "bg-indigo-950 text-white ring-2 ring-indigo-950/20 ring-offset-2" :
                step > s.id ? "bg-emerald-600 text-white" : "bg-white border-2 border-slate-100 text-slate-300 group-hover:border-slate-300"
              )}>
                {step > s.id ? <Check className="w-5 h-5 stroke-[2.5]" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                step === s.id ? "text-indigo-950 font-black" :
                step > s.id ? "text-emerald-700 font-bold" : "text-slate-300"
              )}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={cn(
              "h-0.5 w-8 sm:w-12 rounded-full transition-colors",
              step > i + 1 ? "bg-emerald-500" : "bg-slate-100"
            )} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"
          >
            {/* Pilihan 2 Tipe Ujian */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700">Tipe Pelaksanaan Ujian</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  onClick={() => setFormData({ ...formData, exam_type: 'semester' })}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5",
                    formData.exam_type === 'semester'
                      ? "border-indigo-950 bg-indigo-50/30 shadow-md"
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-xl shrink-0 transition-colors",
                    formData.exam_type === 'semester' ? "bg-indigo-950 text-white" : "bg-slate-100 text-slate-400"
                  )}>
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-indigo-950">Ujian Serentak / Semester</h4>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-950 px-2 py-0.5 rounded-md">Sumatif</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                      Diikuti serentak seluruh murid/tingkat dengan jadwal sesi ujian, pembagian nomor ruang, dan cetak kartu peserta resmi.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setFormData({ ...formData, exam_type: 'harian' })}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5",
                    formData.exam_type === 'harian'
                      ? "border-blue-600 bg-blue-50/30 shadow-md"
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-xl shrink-0 transition-colors",
                    formData.exam_type === 'harian' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                  )}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-indigo-950">Ulangan Harian Kelas</h4>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">Formatif</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                      Ujian mandiri oleh guru mata pelajaran untuk rombel kelas tertentu tanpa memerlukan administrasi ruang dan sesi formal.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-700">Judul Ujian</label>
                <input 
                  type="text" 
                  placeholder={formData.exam_type === 'semester' ? "Contoh: ASAT Informatika Kelas X TP 2026/2027" : "Contoh: Ulangan Harian 1 Algoritma Kelas X-A"}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 font-bold text-indigo-950 text-sm"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Mata Pelajaran</label>
                {isSuperAdmin ? (
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none font-bold text-indigo-950 text-sm cursor-pointer"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  >
                    <option value="">Pilih Mapel...</option>
                    {ALL_SCHOOL_SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : teacherSubjects.length > 1 ? (
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none font-bold text-indigo-950 text-sm cursor-pointer"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  >
                    {teacherSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 font-bold text-indigo-950 text-sm cursor-not-allowed"
                    value={formData.subject || teacherSubjects[0] || 'Informatika'}
                  />
                )}
              </div>
            </div>

            {/* Pengaturan Tambahan Khusus Ujian Serentak / Semester */}
            {formData.exam_type === 'semester' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Sesi Ujian
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Sesi 1 (Pagi)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-xs text-indigo-950 outline-none"
                    value={formData.session_name}
                    onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" /> Jam Pelaksanaan
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-xs text-indigo-950 outline-none"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                    <span className="text-xs font-bold text-slate-400">s/d</span>
                    <input
                      type="time"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-xs text-indigo-950 outline-none"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Kapasitas per Ruang
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-xs text-indigo-950 outline-none"
                      value={formData.room_capacity}
                      onChange={(e) => setFormData({ ...formData, room_capacity: parseInt(e.target.value) || 20 })}
                    />
                    <span className="text-xs font-medium text-slate-400 shrink-0">murid</span>
                  </div>
                </div>
              </div>
            )}

            {/* Target Kelas Section with Tabs */}
            <div className="space-y-4 p-5 sm:p-6 bg-slate-50/70 rounded-3xl border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <GraduationCap className="w-4 h-4 text-indigo-600" /> Target Kelas Peserta Ujian
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Tentukan kelas mana saja yang dapat mengakses dan mengerjakan ujian ini di portal siswa.
                  </p>
                </div>

                {/* Status Indicator */}
                <div className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border w-fit shrink-0",
                  formData.targetClasses.length > 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-700"
                )}>
                  {formData.targetClasses.length > 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{formData.targetClasses.length} kelas ditargetkan</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      <span>Belum ada kelas dipilih</span>
                    </>
                  )}
                </div>
              </div>

              {/* Grade Tabs */}
              {(() => {
                const totalCount = classes.length;
                const totalSelected = formData.targetClasses.length;

                const classesX = getTabClasses('X');
                const selectedX = classesX.filter(c => formData.targetClasses.includes(c.id)).length;

                const classesXI = getTabClasses('XI');
                const selectedXI = classesXI.filter(c => formData.targetClasses.includes(c.id)).length;

                const classesXII = getTabClasses('XII');
                const selectedXII = classesXII.filter(c => formData.targetClasses.includes(c.id)).length;

                const tabs = [
                  { key: 'ALL' as const, label: 'Semua Kelas', total: totalCount, selected: totalSelected },
                  { key: 'X' as const, label: 'Kelas X', total: classesX.length, selected: selectedX },
                  { key: 'XI' as const, label: 'Kelas XI', total: classesXI.length, selected: selectedXI },
                  { key: 'XII' as const, label: 'Kelas XII', total: classesXII.length, selected: selectedXII },
                ];

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {tabs.map(t => {
                      const isActive = selectedGradeTab === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setSelectedGradeTab(t.key)}
                          className={cn(
                            "p-2.5 sm:p-3 rounded-2xl border-2 text-left transition-all relative overflow-hidden cursor-pointer",
                            isActive
                              ? "border-indigo-950 bg-indigo-950 text-white shadow-md shadow-indigo-950/15"
                              : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-xs font-black",
                              isActive ? "text-white" : "text-indigo-950"
                            )}>{t.label}</span>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                              isActive
                                ? "bg-white/20 text-white"
                                : t.selected > 0
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-500"
                            )}>
                              {t.selected > 0 ? `${t.selected} dipilih` : `${t.total} kelas`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Action Bar: Search & Quick Check Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={`🔍 Cari kelas di ${selectedGradeTab === 'ALL' ? 'Semua Tingkat' : `Tingkat ${selectedGradeTab}`} (misal: X-A, XI-B)...`}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-950/10 placeholder:text-slate-400"
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                  />
                  {classSearch && (
                    <button
                      type="button"
                      onClick={() => setClassSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={toggleCurrentTabClasses}
                    className="px-3 py-2 rounded-xl text-[11px] font-black bg-indigo-950 hover:bg-indigo-900 text-white transition-all shadow-xs cursor-pointer"
                  >
                    {(() => {
                      const tabClasses = getTabClasses(selectedGradeTab);
                      const allChecked = tabClasses.length > 0 && tabClasses.every(c => formData.targetClasses.includes(c.id));
                      return allChecked
                        ? `✕ Batal Centang Tab Ini (${tabClasses.length})`
                        : `✓ Centang Semua di Tab Ini (${tabClasses.length})`;
                    })()}
                  </button>
                  {formData.targetClasses.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllClasses}
                      className="px-3 py-2 rounded-xl text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
                    >
                      Kosongkan Pilihan
                    </button>
                  )}
                </div>
              </div>

              {/* Class Cards Grid */}
              {(() => {
                const currentTabClasses = getTabClasses(selectedGradeTab);
                const filtered = currentTabClasses.filter(c => 
                  !classSearch.trim() || 
                  (c.name || '').toLowerCase().includes(classSearch.toLowerCase().trim()) ||
                  (c.tingkat || '').toLowerCase().includes(classSearch.toLowerCase().trim())
                );

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-medium">
                        Tidak ada kelas yang cocok dengan kata kunci "{classSearch}".
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                    {filtered.map(c => {
                      const isChecked = formData.targetClasses.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleClass(c.id)}
                          className={cn(
                            "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border-2 cursor-pointer transition-all select-none group",
                            isChecked
                              ? "border-indigo-950 bg-indigo-50/90 text-indigo-950 font-black shadow-xs ring-1 ring-indigo-950/20"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                            isChecked
                              ? "bg-indigo-950 border-indigo-950 text-white"
                              : "border-slate-300 bg-white group-hover:border-slate-400"
                          )}>
                            {isChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-xs font-bold leading-none block truncate">{c.name}</span>
                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                              Tingkat {c.tingkat || (c.name.startsWith('XII') ? 'XII' : c.name.startsWith('XI') ? 'XI' : 'X')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
              <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <Shuffle className="text-indigo-950 w-4 h-4" />
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-indigo-950">Acak Opsi Jawaban</p>
                  <p className="text-[9px] text-slate-500">Urutan pilihan A/B/C/D diacak.</p>
                </div>
                <input 
                  type="checkbox" checked={formData.randomize_options}
                  onChange={(e) => setFormData({...formData, randomize_options: e.target.checked})}
                  className="w-4 h-4 accent-indigo-950"
                />
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <ShieldAlert className="text-indigo-950 w-4 h-4" />
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-indigo-950">Anti Curang</p>
                  <p className="text-[9px] text-slate-500">Deteksi & blokir jika keluar tab.</p>
                </div>
                <input 
                  type="checkbox" checked={formData.anti_cheat}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData({
                      ...formData,
                      anti_cheat: checked,
                      unlock_code: checked && !formData.unlock_code
                        ? Math.random().toString(36).substr(2, 6).toUpperCase()
                        : formData.unlock_code
                    });
                  }}
                  className="w-4 h-4 accent-indigo-950"
                />
              </div>
              {formData.anti_cheat && (
                <div className="space-y-3 pl-2">
                  <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-indigo-950">Batas Toleransi</p>
                      <p className="text-[9px] text-slate-500">Maksimal keluar tab sebelum diblokir.</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[
                        { label: '1x', value: 1 },
                        { label: '2x', value: 2 },
                        { label: '3x', value: 3 },
                        { label: 'Tak Terbatas', value: 0 }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData({...formData, cheat_tolerance: opt.value})}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                            formData.cheat_tolerance === opt.value
                              ? "bg-indigo-950 text-white shadow"
                              : "bg-white text-slate-400 border border-slate-200 hover:border-slate-300"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-emerald-50/50">
                    <KeyRound className="text-emerald-600 w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-emerald-700">Kode Unlock</p>
                      <p className="text-[8px] text-emerald-500 leading-tight">Berikan kode ini ke murid yang terblokir agar bisa melanjutkan.</p>
                    </div>
                    <span className="px-3 py-1.5 bg-white rounded-lg border border-emerald-200 text-xs font-black text-emerald-700 font-mono tracking-widest select-all">
                      {formData.unlock_code || '-'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <button 
              type="button"
              onClick={handleNextToStep2}
              className="w-full bg-indigo-950 hover:bg-indigo-900 text-white py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 text-sm shadow-xl shadow-indigo-950/15 cursor-pointer transition-all active:scale-[0.99]"
            >
              <span>Lanjut ke Pengisian Soal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Step 2 Overview Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-950 px-2 py-0.5 rounded-md">
                    {formData.subject || 'Informatika'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    • {formData.duration} Menit
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                    🎯 {formData.targetClasses.length} Target Kelas Terpilih
                  </span>
                </div>
                <h3 className="text-base font-black text-indigo-950">{formData.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Ubah Pengaturan
              </button>
            </div>

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
                        <optgroup label="Standar Utama (Default)">
                          <option value="Pilihan Ganda">Pilihan Ganda (5 Opsi)</option>
                          <option value="Essay">Essay (Uraian)</option>
                        </optgroup>
                        <optgroup label="TKA Klasik">
                          <option value="Pilihan Ganda Asosiatif (TKA)">Pilihan Ganda Asosiatif (1, 2, 3, 4)</option>
                          <option value="Hubungan Sebab Akibat (TKA)">Hubungan Sebab Akibat (TKA)</option>
                        </optgroup>
                        <optgroup label="TKA Modern & AKM">
                          <option value="Pilihan Ganda Kompleks">Pilihan Ganda Kompleks (Centang Banyak)</option>
                          <option value="Menjodohkan">Menjodohkan (Matching Pairs)</option>
                          <option value="Isian Singkat">Isian Singkat (Rumpang / Angka)</option>
                          <option value="Drag and Drop">Drag and Drop (Mengurutkan)</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                  <textarea 
                    placeholder="Masukkan pertanyaan di sini..."
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/10 min-h-[80px] font-medium text-sm text-indigo-950"
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
                          className="absolute top-2 right-2 bg-white p-1.5 rounded-lg shadow-md border border-slate-200"
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    )}
                  
                  {/* Pilihan Ganda Tunggal & TKA Klasik */}
                  {(q.question_type === 'Pilihan Ganda' || q.question_type === 'Pilihan Ganda Asosiatif (TKA)' || q.question_type === 'Hubungan Sebab Akibat (TKA)' || !q.question_type) && q.options && q.options.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opsi Jawaban & Kunci</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt: any) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <button 
                              type="button"
                              onClick={() => updateQuestion(q.id, 'correct_answer', opt.id)}
                              className={cn(
                                "w-8 h-8 rounded-lg font-bold flex items-center justify-center border-2 transition-all text-xs shrink-0",
                                q.correct_answer === opt.id ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" : "border-slate-100 text-slate-300 hover:border-slate-200"
                              )}
                            >
                              {opt.label}
                            </button>
                            <input 
                              type="text" placeholder={`Pilihan ${opt.label}`}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-100 outline-none focus:border-blue-300 text-xs font-medium text-indigo-950 bg-slate-50/50"
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

                  {/* Pilihan Ganda Kompleks (Multi-Select) */}
                  {q.question_type === 'Pilihan Ganda Kompleks' && q.options && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opsi Jawaban (Multi-Kunci)</label>
                        <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">Centang semua kunci jawaban benar</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt: any) => {
                          const currentKeys = String(q.correct_answer || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                          const isChecked = currentKeys.includes(opt.id);
                          return (
                            <div key={opt.id} className="flex items-center gap-2">
                              <button 
                                type="button"
                                onClick={() => {
                                  let nextKeys: string[];
                                  if (isChecked) {
                                    nextKeys = currentKeys.filter(k => k !== opt.id);
                                  } else {
                                    nextKeys = [...currentKeys, opt.id].sort();
                                  }
                                  updateQuestion(q.id, 'correct_answer', nextKeys.join(','));
                                }}
                                className={cn(
                                  "w-8 h-8 rounded-lg font-bold flex items-center justify-center border-2 transition-all text-xs shrink-0",
                                  isChecked ? "bg-indigo-950 border-indigo-950 text-white shadow-sm" : "border-slate-100 text-slate-400 hover:border-slate-200"
                                )}
                              >
                                {isChecked ? '✓ ' + opt.label : opt.label}
                              </button>
                              <input 
                                type="text" placeholder={`Pilihan ${opt.label}`}
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-100 outline-none focus:border-blue-300 text-xs font-medium text-indigo-950 bg-slate-50/50"
                                value={opt.text}
                                onChange={(e) => {
                                  const newOptions = q.options.map((o: any) => o.id === opt.id ? { ...o, text: e.target.value } : o);
                                  updateQuestion(q.id, 'options', newOptions);
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Menjodohkan */}
                  {q.question_type === 'Menjodohkan' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pasangan Menjodohkan (Kiri = Kanan)</label>
                        <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Format: [Premis] = [Pasangan]</span>
                      </div>
                      <div className="space-y-2">
                        {(q.options || [
                          { id: 'a', text: 'Premis 1 = Pasangan 1', label: '1' },
                          { id: 'b', text: 'Premis 2 = Pasangan 2', label: '2' },
                          { id: 'c', text: 'Premis 3 = Pasangan 3', label: '3' },
                          { id: 'd', text: 'Premis 4 = Pasangan 4', label: '4' }
                        ]).map((opt: any, pIdx: number) => {
                          const parts = String(opt.text || '').split('=');
                          const left = parts[0]?.trim() || '';
                          const right = parts.slice(1).join('=').trim();
                          return (
                            <div key={opt.id || pIdx} className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-950 font-bold text-xs flex items-center justify-center shrink-0">{pIdx + 1}</span>
                              <input 
                                type="text"
                                placeholder="Pernyataan Kiri (Premis)..."
                                className="flex-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-indigo-950 outline-none"
                                value={left}
                                onChange={(e) => {
                                  const updatedText = e.target.value.trim() || right ? `${e.target.value} = ${right}` : '';
                                  const newOptions = (q.options || []).map((o: any) => o.id === opt.id ? { ...o, text: updatedText } : o);
                                  updateQuestion(q.id, 'options', newOptions);
                                }}
                              />
                              <span className="font-bold text-slate-400 hidden sm:inline text-xs">➔</span>
                              <input 
                                type="text"
                                placeholder="Pasangan Kanan (Jawaban)..."
                                className="flex-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-emerald-700 outline-none"
                                value={right}
                                onChange={(e) => {
                                  const updatedText = left || e.target.value.trim() ? `${left} = ${e.target.value}` : '';
                                  const newOptions = (q.options || []).map((o: any) => o.id === opt.id ? { ...o, text: updatedText } : o);
                                  updateQuestion(q.id, 'options', newOptions);
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Isian Singkat */}
                  {q.question_type === 'Isian Singkat' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kunci Jawaban Teks / Angka</label>
                        <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md">Case-insensitive</span>
                      </div>
                      <input 
                        type="text"
                        placeholder="Contoh: Fotosintesis atau 25 atau alternatif: Jakarta|DKI Jakarta"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none font-bold text-xs text-indigo-950"
                        value={q.correct_answer || ''}
                        onChange={(e) => updateQuestion(q.id, 'correct_answer', e.target.value)}
                      />
                      <p className="text-[10px] text-slate-400 italic">
                        💡 Murid akan mengetik jawaban di kotak isian langsung. Gunakan tanda <code className="bg-slate-100 px-1 font-bold">|</code> untuk beberapa variasi jawaban benar.
                      </p>
                    </div>
                  )}

                  {/* Drag and Drop (Mengurutkan) */}
                  {q.question_type === 'Drag and Drop' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Urutan Kronologi yang Benar (Atas ke Bawah)</label>
                        <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">Urutan Awal ➔ Akhir</span>
                      </div>
                      <div className="space-y-2">
                        {(q.options || [
                          { id: 'a', text: 'Tahap 1 (Awal)', label: 'Tahap 1' },
                          { id: 'b', text: 'Tahap 2', label: 'Tahap 2' },
                          { id: 'c', text: 'Tahap 3', label: 'Tahap 3' },
                          { id: 'd', text: 'Tahap 4 (Akhir)', label: 'Tahap 4' }
                        ]).map((opt: any, dIdx: number) => (
                          <div key={opt.id || dIdx} className="flex items-center gap-2">
                            <span className="w-16 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Tahap {dIdx + 1}</span>
                            <input 
                              type="text"
                              placeholder={`Masukkan teks tahap ${dIdx + 1}...`}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-100 outline-none text-xs font-medium text-indigo-950 bg-slate-50/50"
                              value={opt.text}
                              onChange={(e) => {
                                const newOptions = (q.options || []).map((o: any) => o.id === opt.id ? { ...o, text: e.target.value } : o);
                                updateQuestion(q.id, 'options', newOptions);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Essay */}
                  {q.question_type === 'Essay' && (
                    <p className="text-[11px] text-slate-400 font-bold bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 italic">
                      📝 Tipe Essay tidak memerlukan opsi jawaban maupun kunci jawaban pilihan ganda.
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali ke Pengaturan
              </button>
              <button 
                type="button" 
                onClick={handleCreateExam} 
                disabled={loading || questions.length === 0} 
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-600/20 cursor-pointer transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Simpan & Terbitkan Ujian Sekarang</>}
              </button>
            </div>
          </motion.div>
        )}

        {showBankModal && (
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
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
                        <p className="text-[10px] text-slate-400 mt-0.5">Kelas {q.jenjang || 'X'} &bull; {q.category || 'Umum'} &bull; {q.type}</p>
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
          </div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-100 shadow-xl space-y-6 max-w-2xl mx-auto"
          >
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Status: Ujian Aktif
              </span>
              <h3 className="text-2xl font-black text-indigo-950 tracking-tight">Ujian Berhasil Diterbitkan!</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                Ujian sudah otomatis <strong>aktif di Portal Murid</strong> untuk kelas yang Anda tentukan. Murid cukup masuk ke akun dan mengklik tombol <strong>"Mulai Ujian"</strong>.
              </p>
            </div>

            {/* Exam Details Card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/70 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-xs font-medium text-slate-500">Judul Ujian</span>
                <span className="text-xs font-bold text-indigo-950">{formData.title}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-xs font-medium text-slate-500">Mata Pelajaran</span>
                <span className="text-xs font-bold text-indigo-950">{formData.subject || 'Informatika'}</span>
              </div>
              <div className="flex items-start justify-between border-b border-slate-200/60 pb-2.5 gap-4">
                <span className="text-xs font-medium text-slate-500 shrink-0">Target Kelas</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                  {classes.filter(c => formData.targetClasses.includes(c.id)).map(c => (
                    <span key={c.id} className="bg-indigo-100 text-indigo-950 px-2 py-0.5 rounded text-[10px] font-bold">
                      {c.name}
                    </span>
                  ))}
                  {formData.targetClasses.length === 0 && (
                    <span className="text-xs text-slate-400">Semua Kelas</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-xs font-medium text-slate-500">Durasi Pengerjaan</span>
                <span className="text-xs font-bold text-indigo-950">{formData.duration} Menit</span>
              </div>
              {formData.unlock_code && (
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                  <span className="text-xs font-medium text-slate-500">Token Masuk Ujian</span>
                  <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                    {formData.unlock_code}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Visibilitas Portal</span>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Langsung Muncul di Beranda Murid
                </span>
              </div>
            </div>

            {/* Direct Link (Optional) */}
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400" /> Tautan Langsung ke Ujian (Opsional / Cadangan):
              </label>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-3">
                <input readOnly value={generatedLink} className="bg-transparent border-none outline-none flex-1 text-xs font-mono text-indigo-950 overflow-x-auto" />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    showAlert({ title: 'Disalin!', message: 'Link ujian telah disalin ke clipboard.', type: 'success' });
                  }}
                  className="text-indigo-950 font-black text-[10px] uppercase tracking-widest px-3 py-1.5 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-all shrink-0"
                >
                  Salin Link
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button 
                onClick={() => navigate('/daftar-ujian')} 
                className="bg-indigo-950 text-white py-3 rounded-xl font-bold hover:bg-indigo-900 transition-all text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-950/20 cursor-pointer"
              >
                Lihat Daftar Ujian
              </button>
              <button 
                onClick={() => navigate('/student/dashboard')} 
                className="bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Simulasi Portal Murid
              </button>
              <button 
                onClick={() => {
                  setStep(1);
                  setQuestions([]);
                  setFormData(prev => ({
                    ...prev,
                    title: '',
                    targetClasses: []
                  }));
                }} 
                className="py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs cursor-pointer"
              >
                Buat Ujian Baru
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
