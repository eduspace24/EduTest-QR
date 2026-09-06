import { useState, useEffect } from 'react';
import { 
  FileText, 
  Trash2, 
  Clock, 
  Search, 
  Calendar, 
  Plus, 
  ChevronRight,
  Shield,
  Eye,
  AlertCircle,
  Link as LinkIcon,
  BookOpen,
  Edit3,
  Users,
  Send,
  Lock,
  EyeOff,
  CheckCircle2,
  X,
  Save,
  Loader2,
  Check,
  Shuffle,
  KeyRound,
  Layers,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../context/AlertContext';
import { TableSkeleton } from '../components/Skeleton';
import { getCollectionData, saveCollection } from '../lib/db';
import { supabase } from '../lib/supabase';
import { cn, resolveExamType } from '../lib/utils';
import { CLASSES_LIST } from '../lib/seedAccounts';

export default function DaftarUjian() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'draft' | 'semester' | 'daily'>('all');
  const { showAlert } = useAlert();

  // State untuk Edit Ujian Langsung (Tanpa dialihkan ke Buat Ujian Baru)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [loadingEditDetails, setLoadingEditDetails] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editModalTab, setEditModalTab] = useState<'settings' | 'classes' | 'questions'>('settings');
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [gradeFilterTab, setGradeFilterTab] = useState<'ALL' | 'X' | 'XI' | 'XII'>('ALL');

  const showShareLink = (exam: any) => {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    const teacherId = session.user?.id || 'anonymous';
    const link = `${window.location.origin}/test/${teacherId}/${exam.driveFileId}`;

    navigator.clipboard.writeText(link);
    
    showAlert({
      title: 'Link Ujian Disalin',
      message: `Tautan ujian disalin:\n${link}\n\nBagikan tautan ini kepada siswa.`,
      type: 'success'
    });
  };

  // Muat data kelas sekolah
  useEffect(() => {
    const loadClasses = async () => {
      try {
        let list: any[] = [];
        try {
          const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../lib/appwrite');
          const res = await databases.listDocuments(APPWRITE_DATABASE_ID, COLLECTIONS.CLASSES, [Query.limit(100)]);
          if (res && res.documents && res.documents.length > 0) {
            list = res.documents;
          }
        } catch {}

        if (list.length === 0) {
          const local = await getCollectionData('classes');
          if (local && Array.isArray(local) && local.length > 0) list = local;
        }

        const classMap = new Map<string, any>();
        CLASSES_LIST.forEach((c: any) => {
          const name = c.name || c.nama || '';
          classMap.set(name.toUpperCase(), { id: c.id || name, name, tingkat: name.startsWith('XII') ? 'XII' : name.startsWith('XI') ? 'XI' : 'X' });
        });
        list.forEach((c: any) => {
          const name = c.name || c.nama || '';
          if (name) {
            classMap.set(name.toUpperCase(), { id: c.id || c.$id || name, name, tingkat: name.startsWith('XII') ? 'XII' : name.startsWith('XI') ? 'XI' : 'X' });
          }
        });

        setAvailableClasses(Array.from(classMap.values()));
      } catch {
        setAvailableClasses(CLASSES_LIST.map((c: any) => ({ id: c.id || c.name, name: c.name, tingkat: c.name.startsWith('XII') ? 'XII' : c.name.startsWith('XI') ? 'XI' : 'X' })));
      }
    };
    loadClasses();
  }, []);

  // Muat daftar ujian
  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      try {
        const localExams = (await getCollectionData('exams_list')) || [];
        const localRawExams = (await getCollectionData('exams')) || [];
        const combinedLocal = [...localExams, ...localRawExams];
        const localMap = new Map<string, any>();
        for (const item of combinedLocal) {
          if (item && item.id) {
            localMap.set(item.id, { ...(localMap.get(item.id) || {}), ...item });
          }
        }

        let allExams: any[] = [];
        try {
          const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../lib/appwrite');
          const res = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.EXAMS,
            [Query.orderDesc('$createdAt'), Query.limit(100)]
          );

          if (res && res.documents && res.documents.length > 0) {
            allExams = res.documents.map(d => {
              const local = localMap.get(d.$id) || {};
              let parsedCloudConfig: any = {};
              let rawQuestions: any[] = [];
              if (typeof d.questions === 'string') {
                try {
                  const p = JSON.parse(d.questions);
                  if (p && typeof p === 'object' && !Array.isArray(p)) {
                    parsedCloudConfig = p;
                    rawQuestions = p.questions || [];
                  } else if (Array.isArray(p)) {
                    rawQuestions = p;
                  }
                } catch {}
              } else if (Array.isArray(d.questions)) {
                rawQuestions = d.questions;
              }
              return {
                ...local,
                ...d,
                id: d.$id,
                created_at: d.$createdAt,
                questions: local.questions || rawQuestions || [],
                targetClasses: local.targetClasses || parsedCloudConfig.targetClasses || d.targetClasses || [],
                targetClassNames: local.targetClassNames || parsedCloudConfig.targetClassNames || d.targetClassNames || [],
                exam_type: resolveExamType(local, parsedCloudConfig, d),
                session_name: local.session_name || parsedCloudConfig.session_name || d.session_name || '',
                show_score: local.show_score !== undefined ? local.show_score : (parsedCloudConfig.show_score !== undefined ? parsedCloudConfig.show_score : true),
                submission_mode: local.submission_mode || parsedCloudConfig.submission_mode || 'hybrid'
              };
            });
          }
        } catch {}

        // Tambahkan exam lokal jika tidak ada di Cloud
        const existingIds = new Set(allExams.map(e => e.id));
        for (const [id, localItem] of localMap.entries()) {
          if (!existingIds.has(id)) {
            allExams.push({
              ...localItem,
              exam_type: resolveExamType(localItem)
            });
            existingIds.add(id);
          }
        }

        setExams(allExams);
        await saveCollection('exams_list', allExams);
      } catch {
        const localExams = await getCollectionData('exams_list');
        setExams(localExams || []);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  // Buka Modal Edit Ujian Langsung
  const handleOpenDirectEdit = async (examObj: any) => {
    const examId = examObj.id || examObj.$id || examObj.driveFileId;
    setLoadingEditDetails(true);
    setIsEditModalOpen(true);
    setEditModalTab('settings');

    let fullExam = { ...examObj };

    // Jika data soal belum lengkap, ambil dari Appwrite atau IndexedDB
    try {
      let doc: any = null;
      try {
        const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../lib/appwrite');
        doc = await databases.getDocument(APPWRITE_DATABASE_ID, COLLECTIONS.EXAMS, examId);
      } catch {}

      if (!doc) {
        doc = await getCollectionData('exam_' + examId);
      }

      if (doc) {
        let parsedQuestions: any[] = [];
        let rawConfig: any = {};
        if (typeof doc.questions === 'string') {
          try {
            const p = JSON.parse(doc.questions);
            if (Array.isArray(p)) {
              parsedQuestions = p;
            } else if (p && typeof p === 'object') {
              rawConfig = p;
              parsedQuestions = p.questions || [];
            }
          } catch {}
        } else if (Array.isArray(doc.questions)) {
          parsedQuestions = doc.questions;
        }

        fullExam = {
          ...fullExam,
          ...doc,
          ...rawConfig,
          id: examId,
          questions: parsedQuestions.length > 0 ? parsedQuestions : (fullExam.questions || []),
          targetClasses: fullExam.targetClasses || doc.targetClasses || rawConfig.targetClasses || [],
          targetClassNames: fullExam.targetClassNames || doc.targetClassNames || rawConfig.targetClassNames || [],
        };
      }
    } catch (err) {
      console.warn('Error loading full exam details:', err);
    } finally {
      // Pastikan format array dan default values aman
      setEditingExam({
        ...fullExam,
        id: examId,
        title: fullExam.title || 'Ujian Sekolah',
        subject: fullExam.subject || 'Umum',
        duration: Number(fullExam.duration) || 60,
        exam_type: resolveExamType(fullExam),
        session_name: fullExam.session_name || 'Sesi 1',
        start_time: fullExam.start_time || '07:30',
        end_time: fullExam.end_time || '09:30',
        status: fullExam.status || 'active',
        submission_mode: fullExam.submission_mode || 'hybrid',
        show_score: fullExam.show_score !== undefined ? fullExam.show_score : true,
        anti_cheat: fullExam.anti_cheat !== undefined ? fullExam.anti_cheat : true,
        cheat_tolerance: fullExam.cheat_tolerance !== undefined ? Number(fullExam.cheat_tolerance) : 2,
        unlock_code: fullExam.unlock_code || '19SMAN',
        randomized: fullExam.randomized !== undefined ? fullExam.randomized : true,
        randomize_options: fullExam.randomize_options !== undefined ? fullExam.randomize_options : true,
        targetClasses: Array.isArray(fullExam.targetClasses) ? fullExam.targetClasses : [],
        targetClassNames: Array.isArray(fullExam.targetClassNames) ? fullExam.targetClassNames : [],
        questions: Array.isArray(fullExam.questions) ? fullExam.questions : []
      });
      setLoadingEditDetails(false);
    }
  };

  // Simpan Perubahan Langsung
  const handleSaveDirectEdit = async () => {
    if (!editingExam) return;
    if (!editingExam.title?.trim()) {
      showAlert({ title: 'Perhatian', message: 'Judul ujian tidak boleh kosong!', type: 'warning' });
      return;
    }

    try {
      setIsSavingEdit(true);
      const examId = editingExam.id || editingExam.$id || editingExam.driveFileId;

      // Susun mapping nama kelas dari id target
      const resolvedClassNames = availableClasses
        .filter(c => editingExam.targetClasses.includes(c.id))
        .map(c => c.name);

      const updatedPayload = {
        ...editingExam,
        targetClassNames: resolvedClassNames.length > 0 ? resolvedClassNames : editingExam.targetClassNames,
        duration: Number(editingExam.duration) || 60,
        updated_at: new Date().toISOString()
      };

      // Payload konfigurasi lengkap untuk field questions
      const cloudQuestionsPayload = {
        questions: updatedPayload.questions,
        title: updatedPayload.title,
        subject: updatedPayload.subject,
        duration: updatedPayload.duration,
        exam_type: updatedPayload.exam_type,
        session_name: updatedPayload.session_name,
        start_time: updatedPayload.start_time,
        end_time: updatedPayload.end_time,
        targetClasses: updatedPayload.targetClasses,
        targetClassNames: updatedPayload.targetClassNames,
        submission_mode: updatedPayload.submission_mode,
        show_score: updatedPayload.show_score,
        anti_cheat: updatedPayload.anti_cheat,
        cheat_tolerance: updatedPayload.cheat_tolerance,
        unlock_code: updatedPayload.unlock_code,
        randomized: updatedPayload.randomized,
        randomize_options: updatedPayload.randomize_options,
        _answer_key: (updatedPayload.questions || []).map((q: any) => ({
          id: q.id,
          answer: q.correct_answer || q.answer || 'a'
        }))
      };

      // 1. Simpan ke Appwrite Cloud
      try {
        const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../lib/appwrite');
        await databases.updateDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.EXAMS,
          examId,
          {
            title: updatedPayload.title,
            subject: updatedPayload.subject,
            duration: Number(updatedPayload.duration),
            status: updatedPayload.status,
            questions: JSON.stringify(cloudQuestionsPayload)
          }
        );
      } catch (cloudErr) {
        console.warn('Appwrite updateDocument note:', cloudErr);
      }

      // 2. Simpan ke Supabase jika ada
      try {
        await supabase.from('exams').update({
          title: updatedPayload.title,
          subject: updatedPayload.subject,
          duration: Number(updatedPayload.duration),
          status: updatedPayload.status,
          updated_at: new Date().toISOString()
        }).eq('id', examId);
      } catch {}

      // 3. Simpan ke cache IndexedDB & LocalStorage
      await saveCollection('exam_' + examId, updatedPayload);
      localStorage.setItem('edu_exam_' + examId, JSON.stringify(updatedPayload));
      localStorage.setItem(`edu_exam_${examId}_updated`, new Date().toISOString());

      // Update state exams_list
      const currentList = (await getCollectionData('exams_list')) || [];
      const updatedList = currentList.map((e: any) => {
        const eId = e.id || e.$id || e.driveFileId;
        return eId === examId ? { ...e, ...updatedPayload } : e;
      });
      await saveCollection('exams_list', updatedList);

      const rawExams = (await getCollectionData('exams')) || [];
      const updatedRaw = rawExams.map((e: any) => {
        const eId = e.id || e.$id || e.driveFileId;
        return eId === examId ? { ...e, ...updatedPayload } : e;
      });
      await saveCollection('exams', updatedRaw);

      // 4. Update tampilan tabel real-time
      setExams(prev => prev.map(e => {
        const eId = e.id || e.$id || e.driveFileId;
        return eId === examId ? { ...e, ...updatedPayload } : e;
      }));

      setIsEditModalOpen(false);
      setEditingExam(null);

      showAlert({
        title: 'Ujian Diperbarui',
        message: `Perubahan "${updatedPayload.title}" berhasil disimpan.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error saving exam:', err);
      showAlert({
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan saat menyimpan perubahan.',
        type: 'error'
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Toggle Kelas Pilihan
  const toggleClassTarget = (classId: string) => {
    if (!editingExam) return;
    const current = editingExam.targetClasses || [];
    const isSelected = current.includes(classId);
    const next = isSelected 
      ? current.filter((id: string) => id !== classId)
      : [...current, classId];

    const resolvedNames = availableClasses
      .filter(c => next.includes(c.id))
      .map(c => c.name);

    setEditingExam({
      ...editingExam,
      targetClasses: next,
      targetClassNames: resolvedNames
    });
  };

  const selectAllClassesInTab = () => {
    if (!editingExam) return;
    const tabClasses = gradeFilterTab === 'ALL' 
      ? availableClasses 
      : availableClasses.filter(c => c.tingkat === gradeFilterTab);
    const tabIds = tabClasses.map(c => c.id);
    const combined = Array.from(new Set([...(editingExam.targetClasses || []), ...tabIds]));
    const resolvedNames = availableClasses
      .filter(c => combined.includes(c.id))
      .map(c => c.name);

    setEditingExam({
      ...editingExam,
      targetClasses: combined,
      targetClassNames: resolvedNames
    });
  };

  const clearClassesInTab = () => {
    if (!editingExam) return;
    const tabClasses = gradeFilterTab === 'ALL' 
      ? availableClasses 
      : availableClasses.filter(c => c.tingkat === gradeFilterTab);
    const tabIds = new Set(tabClasses.map(c => c.id));
    const next = (editingExam.targetClasses || []).filter((id: string) => !tabIds.has(id));
    const resolvedNames = availableClasses
      .filter(c => next.includes(c.id))
      .map(c => c.name);

    setEditingExam({
      ...editingExam,
      targetClasses: next,
      targetClassNames: resolvedNames
    });
  };

  const toggleExamStatus = async (examId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'draft' : 'active';
    const updated = exams.map(e => {
      const eId = e.id || e.$id || e.driveFileId;
      if (eId === examId) {
        return { ...e, status: nextStatus, is_active: nextStatus === 'active' };
      }
      return e;
    });
    setExams(updated);
    await saveCollection('exams_list', updated);

    // Update in IndexedDB 'exams'
    const rawExams = (await getCollectionData('exams')) || [];
    const updatedRaw = rawExams.map((e: any) => {
      const eId = e.id || e.$id || e.driveFileId;
      if (eId === examId) {
        return { ...e, status: nextStatus, is_active: nextStatus === 'active' };
      }
      return e;
    });
    await saveCollection('exams', updatedRaw);

    // Update Appwrite
    try {
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../lib/appwrite');
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.EXAMS,
        examId,
        { status: nextStatus }
      );
    } catch (appwriteErr) {
      console.warn('Appwrite status update note:', appwriteErr);
    }

    showAlert({
      title: nextStatus === 'active' ? 'Ujian Diaktifkan' : 'Ujian Dinonaktifkan',
      message: nextStatus === 'active' 
        ? 'Ujian sekarang aktif di portal siswa.' 
        : 'Ujian dinonaktifkan (disimpan sebagai draf).',
      type: 'success'
    });
  };

  const deleteExam = (examObj: any) => {
    const id = examObj.id || examObj.$id || examObj.driveFileId;
    const title = examObj.title || 'Ujian';

    showAlert({
      title: 'Hapus Ujian?',
      message: `Apakah Anda yakin ingin menghapus "${title}"? Tindakan ini tidak dapat dibatalkan.`,
      type: 'confirm',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      onConfirm: async () => {
        setExams(prev => prev.filter(e => {
          const eId = e.id || e.$id || e.driveFileId;
          return eId !== id;
        }));

        try {
          const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../lib/appwrite');
          const cloudDocId = examObj.$id || examObj.id || id;
          await databases.deleteDocument(APPWRITE_DATABASE_ID, COLLECTIONS.EXAMS, cloudDocId);
        } catch {}

        try {
          await supabase.from('exams').delete().eq('id', id);
        } catch {}

        try {
          const localList = (await getCollectionData('exams_list')) || [];
          await saveCollection('exams_list', localList.filter((e: any) => (e.id || e.$id || e.driveFileId) !== id));

          const rawExams = (await getCollectionData('exams')) || [];
          await saveCollection('exams', rawExams.filter((e: any) => (e.id || e.$id || e.driveFileId) !== id));

          localStorage.removeItem(`edu_exam_${id}`);
          localStorage.removeItem(`edu_exam_${id}_updated`);
        } catch {}

        showAlert({ 
          title: 'Ujian Dihapus', 
          message: `Ujian "${title}" telah berhasil dihapus.`, 
          type: 'success' 
        });
      }
    });
  };

  // Filter tab data counter
  const activeCount = exams.filter(e => (e.status || 'active') === 'active').length;
  const draftCount = exams.filter(e => (e.status || 'active') !== 'active').length;
  const semesterCount = exams.filter(e => resolveExamType(e) === 'semester').length;
  const dailyCount = exams.filter(e => resolveExamType(e) === 'harian').length;

  const filteredExams = (Array.isArray(exams) ? exams : []).filter(e => {
    const matchesSearch = (e.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (e.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const isActive = (e.status || 'active') === 'active';
    if (activeTab === 'active') return isActive;
    if (activeTab === 'draft') return !isActive;
    if (activeTab === 'semester') return resolveExamType(e) === 'semester';
    if (activeTab === 'daily') return resolveExamType(e) === 'harian';

    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Daftar Ujian</h2>
          <p className="text-slate-500 text-sm mt-0.5">Kelola status, jadwal, dan pelaksanaan ujian sekolah dengan mudah.</p>
        </div>
        <button 
          onClick={() => navigate('/buat-ujian')}
          className="bg-indigo-950 hover:bg-indigo-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-950/15 active:scale-95 transition-all text-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Buat Ujian Baru
        </button>
      </div>

      {/* Bar Pencarian & Tab Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Cari berdasarkan judul ujian atau mata pelajaran..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-950 focus:ring-2 focus:ring-indigo-950/10 transition-all font-medium text-sm text-slate-800 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tab Filter Cepat */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'Semua Ujian', count: exams.length },
            { id: 'active', label: '🟢 Aktif di Siswa', count: activeCount },
            { id: 'draft', label: '⚪ Draf (Tersimpan)', count: draftCount },
            { id: 'semester', label: 'Ujian Semester', count: semesterCount },
            { id: 'daily', label: 'Ulangan Harian', count: dailyCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border",
                activeTab === tab.id
                  ? "bg-indigo-950 text-white border-indigo-950 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                activeTab === tab.id ? "bg-white/20 text-white font-bold" : "bg-slate-100 text-slate-500 font-medium"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Konten Kartu Ujian */}
      {loading && exams.length === 0 ? (
        <TableSkeleton rows={3} />
      ) : (
        <div className="space-y-4">
          {filteredExams.map((exam) => {
            const isActive = (exam.status || 'active') === 'active';

            const classNames = Array.isArray(exam.targetClassNames) && exam.targetClassNames.length > 0
              ? exam.targetClassNames.slice(0, 3).join(', ') + (exam.targetClassNames.length > 3 ? ` (+${exam.targetClassNames.length - 3})` : '')
              : 'Semua Kelas';

            const isSemester = resolveExamType(exam) === 'semester';

            const scheduleText = isSemester && exam.session_name
              ? `${exam.session_name} (${exam.start_time || '07:30'} - ${exam.end_time || '09:30'})`
              : 'Kapan saja';

            const modeText = exam.submission_mode === 'direct'
              ? 'Kirim Otomatis'
              : exam.submission_mode === 'qr'
                ? 'Scan Barcode QR'
                : 'Otomatis + Barcode';

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                key={exam.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-indigo-900/40 hover:shadow-md transition-all space-y-4 text-left"
              >
                {/* Bagian Atas */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-indigo-950 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                      <FileText className="w-5 h-5 text-indigo-900" />
                    </div>
                    
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-base font-bold text-slate-900 leading-snug break-words">
                        {exam.title}
                      </h3>

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {exam.subject && (
                          <span className="font-semibold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-indigo-600" />
                            {exam.subject}
                          </span>
                        )}

                        <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {isSemester ? 'Ujian Semester' : 'Ulangan Harian'}
                        </span>

                        <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {classNames}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch Aktif / Nonaktif */}
                  <div className="flex items-center gap-2.5 sm:self-center shrink-0 pt-1 sm:pt-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                    <span className={cn(
                      "text-xs font-bold transition-colors select-none",
                      isActive ? "text-emerald-700" : "text-slate-400"
                    )}>
                      {isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      onClick={() => toggleExamStatus(exam.id || exam.$id, exam.status || 'active')}
                      className={cn(
                        "w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer focus:outline-none shrink-0 shadow-inner",
                        isActive ? "bg-emerald-600" : "bg-slate-300"
                      )}
                      title={isActive ? "Klik untuk menonaktifkan ujian" : "Klik untuk mengaktifkan ujian"}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 bg-white rounded-full shadow-md transition-transform transform duration-200",
                          isActive ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100" />

                {/* Bagian Bawah */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.duration || 60} Menit</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{scheduleText}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Send className="w-3.5 h-3.5 text-slate-400" />
                      <span>{modeText}</span>
                    </div>

                    {exam.anti_cheat && (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Cegah Curang
                      </span>
                    )}

                    {exam.show_score === false ? (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-100 flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Nilai Disembunyikan
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Eye className="w-3 h-3 text-slate-400" /> Nilai Tampil
                      </span>
                    )}
                  </div>

                  {/* Tombol Aksi: Edit Langsung (Tanpa Lempar ke Buat Ujian) */}
                  <div className="flex items-center gap-2 pt-1 sm:pt-0 shrink-0">
                    <button 
                      type="button"
                      onClick={() => handleOpenDirectEdit(exam)}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="Edit ujian"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Edit</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => navigate(`/test/${exam.teacher_id || 'teacher'}/${exam.driveFileId || exam.id}`)}
                      className="px-3 py-1.5 rounded-lg border border-indigo-900 bg-indigo-950 hover:bg-indigo-900 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="Pratinjau lembar ujian"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Uji Coba</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => showShareLink(exam)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Salin link ujian"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Salin Link</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => deleteExam(exam)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer ml-1"
                      title="Hapus ujian ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredExams.length === 0 && (
            <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Tidak Ada Ujian</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto font-medium">
                  {searchTerm 
                    ? 'Tidak ditemukan ujian yang cocok dengan pencarian Anda.' 
                    : 'Belum ada ujian dalam kategori ini. Klik "Buat Ujian Baru" untuk mulai membuat ujian.'}
                </p>
              </div>
              <button 
                onClick={() => navigate('/buat-ujian')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-all cursor-pointer mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Buat Ujian Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDIT UJIAN LANGSUNG (In-Place Direct Exam Editor)                    */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Edit Ujian
                      </span>
                      {editingExam && (
                        <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                          <span className={cn(
                            "text-xs font-bold select-none",
                            editingExam.status === 'active' ? "text-emerald-700" : "text-slate-400"
                          )}>
                            {editingExam.status === 'active' ? 'Aktif' : 'Nonaktif'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={editingExam.status === 'active'}
                            onClick={() => setEditingExam({
                              ...editingExam,
                              status: editingExam.status === 'active' ? 'draft' : 'active'
                            })}
                            className={cn(
                              "w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 shadow-inner",
                              editingExam.status === 'active' ? "bg-emerald-600" : "bg-slate-300"
                            )}
                            title={editingExam.status === 'active' ? "Ujian aktif" : "Ujian nonaktif"}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 bg-white rounded-full shadow-sm transition-transform transform duration-200",
                                editingExam.status === 'active' ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-0.5">
                      {editingExam?.title || 'Memuat Data Ujian...'}
                    </h3>
                  </div>
                </div>

                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Tabs Navigation */}
              <div className="flex items-center border-b border-slate-200 bg-white px-4 text-xs font-bold">
                {[
                  { id: 'settings', label: '1. Pengaturan Ujian' },
                  { id: 'classes', label: `2. Sasaran Kelas (${editingExam?.targetClasses?.length || 0})` },
                  { id: 'questions', label: `3. Butir Soal (${editingExam?.questions?.length || 0})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEditModalTab(tab.id as any)}
                    className={cn(
                      "py-3 px-4 border-b-2 transition-all cursor-pointer",
                      editModalTab === tab.id
                        ? "border-indigo-950 text-indigo-950 bg-indigo-50/40"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Modal Body Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-left">
                {loadingEditDetails ? (
                  <div className="py-20 text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-900 mx-auto" />
                    <p className="text-sm font-semibold text-slate-500">Mengambil detail dan soal ujian...</p>
                  </div>
                ) : editingExam ? (
                  <>
                    {/* TAB 1: PENGATURAN UMUM */}
                    {editModalTab === 'settings' && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-slate-700">Judul Ujian <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={editingExam.title || ''}
                              onChange={(e) => setEditingExam({ ...editingExam, title: e.target.value })}
                              placeholder="Contoh: Asesmen Akhir Semester Informatika"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-900 outline-none focus:border-indigo-950 focus:ring-2 focus:ring-indigo-950/10"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Mata Pelajaran</label>
                            <input
                              type="text"
                              value={editingExam.subject || ''}
                              onChange={(e) => setEditingExam({ ...editingExam, subject: e.target.value })}
                              placeholder="Contoh: Informatika / Matematika"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm text-slate-900 outline-none focus:border-indigo-950"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Durasi Pengerjaan (Menit)</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="5"
                                max="360"
                                value={editingExam.duration || 60}
                                onChange={(e) => setEditingExam({ ...editingExam, duration: Number(e.target.value) || 60 })}
                                className="w-full pl-3.5 pr-16 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-900 outline-none focus:border-indigo-950"
                              />
                              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Menit</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Jenis Ujian</label>
                            <select
                              value={resolveExamType(editingExam)}
                              onChange={(e) => setEditingExam({ ...editingExam, exam_type: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-900 outline-none focus:border-indigo-950 cursor-pointer"
                            >
                              <option value="harian">📝 Ulangan Harian (Fleksibel)</option>
                              <option value="semester">🏛️ Ujian Semester / Resmi</option>
                            </select>
                          </div>

                          {resolveExamType(editingExam) === 'semester' ? (
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">Sesi & Jam Ujian</label>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={editingExam.session_name || 'Sesi 1'}
                                  onChange={(e) => setEditingExam({ ...editingExam, session_name: e.target.value })}
                                  placeholder="Nama Sesi"
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                                />
                                <div className="flex items-center gap-1 text-xs">
                                  <input
                                    type="time"
                                    value={editingExam.start_time || '07:30'}
                                    onChange={(e) => setEditingExam({ ...editingExam, start_time: e.target.value })}
                                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">Jadwal Ulangan</label>
                              <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Fleksibel (Dapat dikerjakan kapan saja selagi berstatus Aktif)</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Metode Pengumpulan Hasil */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-indigo-700" />
                            Metode Pengumpulan Lembar Jawaban:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                              { id: 'hybrid', title: 'Otomatis + Barcode', desc: 'Kirim otomatis via cloud & sediakan barcode cadangan.', icon: '⚡' },
                              { id: 'direct', title: 'Kirim Otomatis', desc: 'Tersimpan otomatis ke server tanpa scan barcode.', icon: '🚀' },
                              { id: 'qr', title: 'Scan Barcode QR', desc: 'Tanpa kuota, tunjukkan barcode ke guru.', icon: '📱' },
                            ].map(opt => (
                              <div
                                key={opt.id}
                                onClick={() => setEditingExam({ ...editingExam, submission_mode: opt.id })}
                                className={cn(
                                  "p-3 rounded-xl border-2 cursor-pointer transition-all text-left",
                                  editingExam.submission_mode === opt.id
                                    ? "border-indigo-950 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-950/10"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                )}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-base">{opt.icon}</span>
                                  {editingExam.submission_mode === opt.id && (
                                    <span className="w-4 h-4 rounded-full bg-indigo-950 text-white flex items-center justify-center text-[10px]">
                                      <Check className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-indigo-950">{opt.title}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{opt.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Pengaturan Nilai & Keamanan */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          {/* Visibilitas Nilai */}
                          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">Tampilkan Nilai ke Siswa</span>
                              <input
                                type="checkbox"
                                checked={editingExam.show_score}
                                onChange={(e) => setEditingExam({ ...editingExam, show_score: e.target.checked })}
                                className="w-4 h-4 accent-indigo-950 cursor-pointer"
                              />
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {editingExam.show_score 
                                ? 'Siswa dapat melihat skor akhir mereka setelah menekan tombol selesai.' 
                                : 'Nilai dirahasiakan oleh guru. Siswa hanya melihat konfirmasi selesai.'}
                            </p>
                          </div>

                          {/* Acak Urutan Soal */}
                          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">Acak Urutan Soal</span>
                              <input
                                type="checkbox"
                                checked={editingExam.randomized}
                                onChange={(e) => setEditingExam({ ...editingExam, randomized: e.target.checked })}
                                className="w-4 h-4 accent-indigo-950 cursor-pointer"
                              />
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Nomor soal teracak otomatis di setiap siswa.
                            </p>
                          </div>

                          {/* Acak Pilihan Jawaban */}
                          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">Acak Pilihan Jawaban</span>
                              <input
                                type="checkbox"
                                checked={editingExam.randomize_options}
                                onChange={(e) => setEditingExam({ ...editingExam, randomize_options: e.target.checked })}
                                className="w-4 h-4 accent-indigo-950 cursor-pointer"
                              />
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Urutan opsi A, B, C, D, E teracak otomatis di setiap siswa.
                            </p>
                          </div>

                          {/* Cegah Curang */}
                          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 sm:col-span-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <Lock className="w-3.5 h-3.5 text-indigo-950" />
                                  Cegah Curang (Kunci Layar Penuh & Peringatan Keluar Tab)
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                checked={editingExam.anti_cheat}
                                onChange={(e) => setEditingExam({ ...editingExam, anti_cheat: e.target.checked })}
                                className="w-4 h-4 accent-indigo-950 cursor-pointer"
                              />
                            </div>

                            {editingExam.anti_cheat && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600">Batas Keluar Aplikasi</label>
                                  <div className="flex items-center gap-1.5">
                                    {[
                                      { label: '1x', val: 1 },
                                      { label: '2x', val: 2 },
                                      { label: '3x', val: 3 },
                                      { label: 'Bebas', val: 0 },
                                    ].map(b => (
                                      <button
                                        key={b.val}
                                        type="button"
                                        onClick={() => setEditingExam({ ...editingExam, cheat_tolerance: b.val })}
                                        className={cn(
                                          "px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                                          editingExam.cheat_tolerance === b.val
                                            ? "bg-indigo-950 text-white border-indigo-950"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                        )}
                                      >
                                        {b.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600">Kunci Buka Ujian (Jika Terkunci)</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingExam.unlock_code || ''}
                                      onChange={(e) => setEditingExam({ ...editingExam, unlock_code: e.target.value.toUpperCase() })}
                                      className="w-36 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold uppercase"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditingExam({ ...editingExam, unlock_code: Math.random().toString(36).substring(2, 8).toUpperCase() })}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                                    >
                                      Acak
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: SASARAN KELAS */}
                    {editModalTab === 'classes' && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">Target Kelas Peserta Ujian</h4>
                            <p className="text-xs text-slate-500">Hanya siswa dari kelas yang dicentang yang dapat melihat ujian ini.</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={selectAllClassesInTab}
                              className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-900 hover:bg-indigo-100 text-xs font-bold cursor-pointer"
                            >
                              Centang Semua
                            </button>
                            <button
                              type="button"
                              onClick={clearClassesInTab}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                            >
                              Hapus Pilihan
                            </button>
                          </div>
                        </div>

                        {/* Filter Tingkat Kelas */}
                        <div className="flex items-center gap-1.5 text-xs">
                          {(['ALL', 'X', 'XI', 'XII'] as const).map(tab => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setGradeFilterTab(tab)}
                              className={cn(
                                "px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer",
                                gradeFilterTab === tab 
                                  ? "bg-indigo-950 text-white border-indigo-950" 
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              )}
                            >
                              {tab === 'ALL' ? 'Semua Tingkat' : `Kelas ${tab}`}
                            </button>
                          ))}
                        </div>

                        {/* Checkbox Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto p-1">
                          {availableClasses
                            .filter(c => gradeFilterTab === 'ALL' || c.tingkat === gradeFilterTab)
                            .map((cls) => {
                              const isChecked = (editingExam.targetClasses || []).includes(cls.id);
                              return (
                                <div
                                  key={cls.id}
                                  onClick={() => toggleClassTarget(cls.id)}
                                  className={cn(
                                    "p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all",
                                    isChecked
                                      ? "bg-indigo-50/80 border-indigo-900/50 text-indigo-950 font-bold shadow-xs"
                                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 font-medium"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}} // dikontrol oleh container click
                                    className="w-4 h-4 accent-indigo-950 cursor-pointer shrink-0"
                                  />
                                  <span className="text-xs truncate">{cls.name}</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: DAFTAR BUTIR SOAL */}
                    {editModalTab === 'questions' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">Daftar Soal ({editingExam.questions?.length || 0} Butir)</h4>
                            <p className="text-xs text-slate-500">Ubah teks pertanyaan, opsi jawaban, dan kunci jawaban.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newQ = {
                                id: `q_${Date.now()}`,
                                question: 'Pertanyaan baru...',
                                type: 'Pilihan Ganda',
                                options: [
                                  { id: 'a', text: 'Pilihan A' },
                                  { id: 'b', text: 'Pilihan B' },
                                  { id: 'c', text: 'Pilihan C' },
                                  { id: 'd', text: 'Pilihan D' },
                                  { id: 'e', text: 'Pilihan E' }
                                ],
                                correct_answer: 'a',
                                points: 1
                              };
                              setEditingExam({
                                ...editingExam,
                                questions: [...(editingExam.questions || []), newQ]
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-950 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer hover:bg-indigo-900"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Soal
                          </button>
                        </div>

                        {(!editingExam.questions || editingExam.questions.length === 0) ? (
                          <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-600">Ujian ini belum memiliki daftar soal tersimpan.</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Klik tombol "Tambah Soal" di atas untuk menambahkan butir pertanyaan.</p>
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-96 overflow-y-auto p-1">
                            {editingExam.questions.map((q: any, qIdx: number) => (
                              <div key={q.id || qIdx} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-indigo-950 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                                    Soal #{qIdx + 1} • {q.type || 'Pilihan Ganda'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = editingExam.questions.filter((_: any, i: number) => i !== qIdx);
                                      setEditingExam({ ...editingExam, questions: next });
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                    title="Hapus soal ini"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600">Teks Pertanyaan</label>
                                  <textarea
                                    rows={2}
                                    value={q.question || ''}
                                    onChange={(e) => {
                                      const next = [...editingExam.questions];
                                      next[qIdx] = { ...next[qIdx], question: e.target.value };
                                      setEditingExam({ ...editingExam, questions: next });
                                    }}
                                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-indigo-950"
                                  />
                                </div>

                                {/* Opsi Jawaban untuk Pilihan Ganda */}
                                {Array.isArray(q.options) && q.options.length > 0 && (
                                  <div className="space-y-2 pt-1 border-t border-slate-100">
                                    <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                                      <span>Pilihan Jawaban & Kunci Benar:</span>
                                      <span className="text-[10px] text-emerald-600 font-bold">Pilih radio untuk menentukan kunci jawaban</span>
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {q.options.map((opt: any, optIdx: number) => {
                                        const optKey = opt.id || String.fromCharCode(97 + optIdx);
                                        const isCorrect = String(q.correct_answer || q.answer || '').trim().toLowerCase() === String(optKey).toLowerCase();

                                        return (
                                          <div key={optIdx} className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <input
                                              type="radio"
                                              name={`correct_key_${qIdx}`}
                                              checked={isCorrect}
                                              onChange={() => {
                                                const next = [...editingExam.questions];
                                                next[qIdx] = { ...next[qIdx], correct_answer: optKey, answer: optKey };
                                                setEditingExam({ ...editingExam, questions: next });
                                              }}
                                              className="w-4 h-4 accent-emerald-600 cursor-pointer ml-1"
                                            />
                                            <span className="font-mono text-xs font-bold uppercase text-slate-500">{optKey}.</span>
                                            <input
                                              type="text"
                                              value={opt.text || ''}
                                              onChange={(e) => {
                                                const next = [...editingExam.questions];
                                                const nextOpts = [...next[qIdx].options];
                                                nextOpts[optIdx] = { ...nextOpts[optIdx], text: e.target.value };
                                                next[qIdx] = { ...next[qIdx], options: nextOpts };
                                                setEditingExam({ ...editingExam, questions: next });
                                              }}
                                              className="flex-1 px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-medium">
                  {editingExam && (
                    <span>
                      {editingExam.questions?.length || 0} Soal • {editingExam.targetClasses?.length || 'Semua'} Kelas • Durasi {editingExam.duration} Menit
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSavingEdit}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDirectEdit}
                    disabled={isSavingEdit || loadingEditDetails}
                    className="px-5 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-950/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSavingEdit ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Perubahan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
