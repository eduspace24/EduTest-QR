import { useState, useEffect } from 'react';
import { 
  FileText, 
  Trash2, 
  Clock, 
  Search, 
  Calendar, 
  Plus, 
  BarChart3, 
  Activity,
  ChevronRight,
  Shield,
  Shuffle,
  Eye,
  AlertCircle,
  Link as LinkIcon,
  Copy,
  KeyRound,
  BookOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
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
  const { showAlert } = useAlert();

  const showShareLink = (exam: any) => {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    const teacherId = session.user?.id || 'anonymous';
    const link = `${window.location.origin}/test/${teacherId}/${exam.driveFileId}`;

    navigator.clipboard.writeText(link);
    
    showAlert({
      title: 'Link Ujian',
      message: `Link: ${link}\n\nLink telah disalin ke clipboard. Bagikan ke murid Anda.`,
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
              return {
                ...local,
                ...d,
                id: d.$id,
                created_at: d.$createdAt,
                targetClasses: local.targetClasses || d.targetClasses || [],
                targetClassNames: local.targetClassNames || d.targetClassNames || [],
                exam_type: local.exam_type || d.exam_type || 'semester',
                session_name: local.session_name || d.session_name || ''
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
      if (e.id === examId) {
        return { ...e, status: nextStatus, is_active: nextStatus === 'active' };
      }
      return e;
    });
    setExams(updated);
    await saveCollection('exams_list', updated);

    // Also update in 'exams' collection
    const rawExams = (await getCollectionData('exams')) || [];
    const updatedRaw = rawExams.map((e: any) => {
      if (e.id === examId) {
        return { ...e, status: nextStatus, is_active: nextStatus === 'active' };
      }
      return e;
    });
    await saveCollection('exams', updatedRaw);

    // Also try to update Appwrite if available
    try {
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../lib/appwrite');
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.EXAMS,
        examId,
        { status: nextStatus }
      );
    } catch {}

    showAlert({
      title: 'Status Diperbarui',
      message: nextStatus === 'active' 
        ? 'Ujian sekarang AKTIF dan muncul di portal murid sesuai target kelas.' 
        : 'Ujian dinonaktifkan sementara (disembunyikan dari murid).',
      type: 'success'
    });
  };

  const deleteExam = (id: string, title: string) => {
    showAlert({
      title: 'Hapus Ujian?',
      message: `Apakah Anda yakin ingin menghapus "${title}"?`,
      type: 'confirm',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        try {
          await supabase.from('exams').delete().eq('id', id);
        } catch {}

        const updated = exams.filter(e => e.id !== id);
        setExams(updated);
        await saveCollection('exams_list', updated);
        const rawExams = (await getCollectionData('exams')) || [];
        await saveCollection('exams', rawExams.filter((e: any) => e.id !== id));

        showAlert({ title: 'Terhapus', message: 'Ujian berhasil dihapus.', type: 'success' });
      }
    });
  };

  const filteredExams = (Array.isArray(exams) ? exams : []).filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="tracking-tight">Daftar Ujian</h2>
          <p className="text-slate-500 text-sm font-medium">Kelola status aktif, target kelas, dan pantau ujian Anda.</p>
        </div>
        <button 
          onClick={() => navigate('/buat-ujian')}
          className="bg-indigo-950 hover:bg-indigo-900 text-white px-6 py-2.5 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/20 active:scale-95 transition-all text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Buat Ujian Baru
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" placeholder="Cari judul ujian..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading && exams.length === 0 ? (
        <TableSkeleton rows={3} />
      ) : (
        <div className="grid gap-4">
          {filteredExams.map((exam) => {
            const isActive = (exam.status || 'active') === 'active';

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={exam.id}
                className="group bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 hover:border-indigo-950/20 hover:shadow-xl hover:shadow-indigo-950/5 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-950 group-hover:bg-indigo-950 group-hover:text-white transition-colors shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-indigo-950 truncate">{exam.title}</h3>
                      {exam.exam_type === 'semester' ? (
                        <span className="bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 border border-indigo-200">
                          Ujian Semester
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 border border-blue-200">
                          Ulangan Harian
                        </span>
                      )}
                      
                      {/* Interactive Status Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleExamStatus(exam.id, exam.status || 'active')}
                        title="Klik untuk mengubah status aktif/nonaktif ujian di portal murid"
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 cursor-pointer transition-all border flex items-center gap-1",
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                        {isActive ? 'Aktif di Murid' : 'Nonaktif (Draft)'}
                      </button>
                    </div>

                    {/* Target Class Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400">Target Kelas:</span>
                      {Array.isArray(exam.targetClassNames) && exam.targetClassNames.length > 0 ? (
                        exam.targetClassNames.slice(0, 6).map((cnStr: string) => (
                          <span key={cnStr} className="bg-indigo-50 text-indigo-950 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-100">
                            {cnStr}
                          </span>
                        ))
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Semua Kelas
                        </span>
                      )}
                      {Array.isArray(exam.targetClassNames) && exam.targetClassNames.length > 6 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          +{exam.targetClassNames.length - 6} kelas lainnya
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] sm:text-xs text-slate-400 font-bold items-center pt-0.5">
                      {exam.subject && (
                        <div className="flex items-center gap-1.5 text-indigo-950 font-black">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> {exam.subject}
                        </div>
                      )}
                      {exam.session_name && (
                        <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" /> {exam.session_name} ({exam.start_time || '07:30'} - {exam.end_time || '09:30'})
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> {exam.duration} Menit
                      </div>
                      <div className="flex items-center gap-1.5 text-indigo-950/40">
                        <Shield className="w-3.5 h-3.5" /> {exam.strict_mode ? 'Mode Ketat' : 'Reguler'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Shuffle className="w-3.5 h-3.5 text-indigo-950/40" /> {exam.randomized ? 'Acak' : 'Urut'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" /> {exam.anti_cheat ? 'Anti Curang' : 'Reguler'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap">
                    {exam.anti_cheat && exam.unlock_code && (
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span className="font-mono tracking-widest text-[10px] font-black">{exam.unlock_code}</span>
                      </div>
                    )}

                    <button 
                      type="button"
                      onClick={() => navigate(`/test/${exam.teacher_id || 'teacher'}/${exam.driveFileId || exam.id}`)}
                      className="bg-indigo-950 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-indigo-900 transition-all cursor-pointer shadow-xs"
                      title="Lihat lembar ujian di portal"
                    >
                      <Eye className="w-3.5 h-3.5" /> Uji Coba
                    </button>

                    <button 
                      type="button"
                      onClick={() => showShareLink(exam)}
                      className="bg-blue-50 text-blue-700 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-all border border-blue-100 cursor-pointer"
                      title="Salin link langsung ujian"
                    >
                      <LinkIcon className="w-3.5 h-3.5" /> Link
                    </button>

                    <button 
                      type="button"
                      onClick={() => deleteExam(exam.id, exam.title)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      title="Hapus ujian"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredExams.length === 0 && (
            <div className="py-12 sm:py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
              <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-indigo-950">Tidak Ada Ujian</h3>
              <p className="text-slate-400 mt-2 text-sm font-medium">Belum ada ujian yang dibuat atau hasil pencarian kosong.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
