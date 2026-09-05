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
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../context/AlertContext';
import { TableSkeleton } from '../components/Skeleton';
import { getCollectionData, saveCollection } from '../lib/db';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export default function DaftarUjian() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'draft' | 'semester' | 'daily'>('all');
  const { showAlert } = useAlert();

  const showShareLink = (exam: any) => {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    const teacherId = session.user?.id || 'anonymous';
    const link = `${window.location.origin}/test/${teacherId}/${exam.driveFileId}`;

    navigator.clipboard.writeText(link);
    
    showAlert({
      title: 'Link Ujian Disalin',
      message: `Tautan ujian berhasil disalin ke clipboard:\n${link}\n\nAnda dapat membagikan tautan ini langsung kepada siswa.`,
      type: 'success'
    });
  };

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
              if (typeof d.questions === 'string') {
                try {
                  const p = JSON.parse(d.questions);
                  if (p && typeof p === 'object' && !Array.isArray(p)) {
                    parsedCloudConfig = p;
                  }
                } catch {}
              }
              return {
                ...local,
                ...d,
                id: d.$id,
                created_at: d.$createdAt,
                targetClasses: local.targetClasses || parsedCloudConfig.targetClasses || d.targetClasses || [],
                targetClassNames: local.targetClassNames || parsedCloudConfig.targetClassNames || d.targetClassNames || [],
                exam_type: local.exam_type || parsedCloudConfig.exam_type || d.exam_type || 'semester',
                session_name: local.session_name || parsedCloudConfig.session_name || d.session_name || '',
                show_score: local.show_score !== undefined ? local.show_score : (parsedCloudConfig.show_score !== undefined ? parsedCloudConfig.show_score : true),
                submission_mode: local.submission_mode || parsedCloudConfig.submission_mode || 'hybrid'
              };
            });
          }
        } catch {}

        // Add local exams not in Appwrite
        const existingIds = new Set(allExams.map(e => e.id));
        for (const [id, localItem] of localMap.entries()) {
          if (!existingIds.has(id)) {
            allExams.push(localItem);
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

    // Also update in 'exams' collection
    const rawExams = (await getCollectionData('exams')) || [];
    const updatedRaw = rawExams.map((e: any) => {
      const eId = e.id || e.$id || e.driveFileId;
      if (eId === examId) {
        return { ...e, status: nextStatus, is_active: nextStatus === 'active' };
      }
      return e;
    });
    await saveCollection('exams', updatedRaw);

    // Also update Appwrite cloud database
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
      title: nextStatus === 'active' ? 'Ujian Telah Diaktifkan' : 'Ujian Dinonaktifkan',
      message: nextStatus === 'active' 
        ? 'Ujian sekarang berstatus AKTIF dan dapat dilihat oleh siswa di portal mereka.' 
        : 'Ujian disimpan sebagai DRAF (tidak muncul di portal siswa).',
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
        // 1. Optimistic UI update
        setExams(prev => prev.filter(e => {
          const eId = e.id || e.$id || e.driveFileId;
          return eId !== id;
        }));

        // 2. Hapus dari Appwrite Cloud Database
        try {
          const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../lib/appwrite');
          const cloudDocId = examObj.$id || examObj.id || id;
          await databases.deleteDocument(APPWRITE_DATABASE_ID, COLLECTIONS.EXAMS, cloudDocId);
        } catch (cloudErr) {
          console.warn('Appwrite deleteDocument notice:', cloudErr);
        }

        // 3. Hapus dari Supabase jika ada
        try {
          await supabase.from('exams').delete().eq('id', id);
        } catch {}

        // 4. Bersihkan cache lokal IndexedDB & LocalStorage
        try {
          const localList = (await getCollectionData('exams_list')) || [];
          const updatedList = localList.filter((e: any) => {
            const eId = e.id || e.$id || e.driveFileId;
            return eId !== id;
          });
          await saveCollection('exams_list', updatedList);

          const rawExams = (await getCollectionData('exams')) || [];
          const updatedRaw = rawExams.filter((e: any) => {
            const eId = e.id || e.$id || e.driveFileId;
            return eId !== id;
          });
          await saveCollection('exams', updatedRaw);

          localStorage.removeItem(`edu_exam_${id}`);
          localStorage.removeItem(`edu_exam_${id}_updated`);
        } catch (localErr) {
          console.error('Local cache delete error:', localErr);
        }

        showAlert({ 
          title: 'Ujian Dihapus', 
          message: `Ujian "${title}" telah berhasil dihapus.`, 
          type: 'success' 
        });
      }
    });
  };

  // Filter logic
  const activeCount = exams.filter(e => (e.status || 'active') === 'active').length;
  const draftCount = exams.filter(e => (e.status || 'active') !== 'active').length;
  const semesterCount = exams.filter(e => (e.exam_type || 'semester') === 'semester').length;
  const dailyCount = exams.filter(e => e.exam_type === 'harian').length;

  const filteredExams = (Array.isArray(exams) ? exams : []).filter(e => {
    const matchesSearch = (e.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (e.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const isActive = (e.status || 'active') === 'active';
    if (activeTab === 'active') return isActive;
    if (activeTab === 'draft') return !isActive;
    if (activeTab === 'semester') return (e.exam_type || 'semester') === 'semester';
    if (activeTab === 'daily') return e.exam_type === 'harian';

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

            // Target kelas string ringkas
            const classNames = Array.isArray(exam.targetClassNames) && exam.targetClassNames.length > 0
              ? exam.targetClassNames.slice(0, 3).join(', ') + (exam.targetClassNames.length > 3 ? ` (+${exam.targetClassNames.length - 3})` : '')
              : 'Semua Kelas';

            // Jadwal ringkas
            const scheduleText = exam.exam_type === 'semester' && exam.session_name
              ? `${exam.session_name} (${exam.start_time || '07:30'} - ${exam.end_time || '09:30'})`
              : 'Kapan saja • 1x Pengerjaan';

            // Metode pengumpulan ringkas
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
                {/* Bagian Atas: Ikon, Judul, Label, dan Switch Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-indigo-950 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                      <FileText className="w-5 h-5 text-indigo-900" />
                    </div>
                    
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-base font-bold text-slate-900 leading-snug break-words">
                        {exam.title}
                      </h3>

                      {/* Label Ringkas & Bersih */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {exam.subject && (
                          <span className="font-semibold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-indigo-600" />
                            {exam.subject}
                          </span>
                        )}

                        <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {exam.exam_type === 'semester' ? 'Ujian Semester' : 'Ulangan Harian'}
                        </span>

                        <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {classNames}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Pengubah Status: Aktif / Draf */}
                  <div className="sm:self-center shrink-0 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => toggleExamStatus(exam.id || exam.$id, exam.status || 'active')}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer",
                        isActive
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      )}
                      title="Klik untuk mengaktifkan atau menonaktifkan ujian"
                    >
                      <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                      <span>{isActive ? 'Aktif di Siswa' : 'Draf (Nonaktif)'}</span>
                    </button>
                  </div>
                </div>

                {/* Garis Pembatas Halus */}
                <div className="border-t border-slate-100" />

                {/* Bagian Bawah: Informasi Utama & Tombol Aksi */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Parameter Utama */}
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

                  {/* Tombol Aksi */}
                  <div className="flex items-center gap-2 pt-1 sm:pt-0 shrink-0">
                    <button 
                      type="button"
                      onClick={() => navigate(`/buat-ujian?edit=${exam.id || exam.$id || exam.driveFileId}`)}
                      className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
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
    </div>
  );
}
