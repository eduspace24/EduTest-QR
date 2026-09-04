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
  KeyRound
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../context/AlertContext';
import { TableSkeleton } from '../components/Skeleton';
import { getCollectionData, saveCollection } from '../lib/db';
import { supabase } from '../lib/supabase';

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
        const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../lib/appwrite');
        const res = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.EXAMS,
          [Query.orderDesc('$createdAt'), Query.limit(100)]
        );

        if (res && res.documents && res.documents.length > 0) {
          const mapped = res.documents.map(d => ({
            ...d,
            id: d.$id,
            created_at: d.$createdAt
          }));
          setExams(mapped);
          await saveCollection('exams_list', mapped);
        } else {
          const localExams = await getCollectionData('exams_list');
          setExams(localExams || []);
        }
      } catch {
        const localExams = await getCollectionData('exams_list');
        setExams(localExams || []);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

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
          <p className="text-slate-500 text-sm font-medium">Kelola dan pantau semua sesi ujian aktif Anda.</p>
        </div>
        <button 
          onClick={() => navigate('/buat-ujian')}
          className="bg-indigo-950 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/20 active:scale-95 transition-all text-sm"
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
          {filteredExams.map((exam) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={exam.id}
              className="group bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 hover:border-indigo-950/10 hover:shadow-xl hover:shadow-indigo-950/5 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center text-indigo-950 group-hover:bg-indigo-950 group-hover:text-white transition-colors shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base sm:text-lg font-bold text-indigo-950 truncate">{exam.title}</h3>
                    <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">Aktif</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] sm:text-xs text-slate-400 font-bold">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {exam.duration} Menit
                    </div>
                    <div className="flex items-center gap-1.5 text-indigo-950/40">
                      <Shield className="w-3.5 h-3.5" /> {exam.strict_mode ? 'Mode Ketat' : 'Reguler'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shuffle className="w-3.5 h-3.5 text-indigo-950/40" /> {exam.randomized ? 'Acak' : 'Urut'}
                    </div>
                    <div className="flex items-center gap-1.5 text-indigo-950/40">
                      <Shuffle className="w-3.5 h-3.5" /> {exam.randomize_options ? 'Opsi Acak' : 'Opsi Urut'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> {exam.anti_cheat ? 'Anti Curang' : 'Reguler'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  {exam.anti_cheat && exam.unlock_code && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span className="font-mono tracking-widest text-[10px] font-black">{exam.unlock_code}</span>
                    </div>
                  )}
                  <button 
                    onClick={() => showShareLink(exam)}
                    className="flex-1 sm:flex-none bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-100 transition-all active:scale-95 border border-blue-100"
                  >
                    <LinkIcon className="w-3.5 h-3.5" /> Bagikan
                  </button>
                  <button 
                    onClick={() => deleteExam(exam.id, exam.title)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

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
