import { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  ArrowRight,
  BookOpen,
  QrCode,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  ShieldCheck,
  Trophy
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import { getCollectionData } from '../../lib/db';
import { cn } from '../../lib/utils';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [activeExams, setActiveExams] = useState<any[]>([]);
  const [recentSubmission, setRecentSubmission] = useState<any>(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    const user = session?.user || {
      nama: 'Murid Nineteen',
      nisn: '242510311',
      kelas: 'XII',
      role: 'murid'
    };
    setSessionUser(user);

    // Fetch Exams from Appwrite & Local Cache
    const fetchExams = async () => {
      try {
        const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../../lib/appwrite');
        const res = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.EXAMS,
          [Query.equal('status', 'active'), Query.orderDesc('$createdAt'), Query.limit(100)]
        );

        if (res && res.documents && res.documents.length > 0) {
          const mapped = res.documents.map(d => ({
            ...d,
            id: d.$id,
            created_at: d.$createdAt
          }));
          setActiveExams(mapped);
        } else {
          const localExams = await getCollectionData('exams');
          setActiveExams(localExams || []);
        }
      } catch (err) {
        const localExams = await getCollectionData('exams');
        setActiveExams(localExams || []);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();

    // Check last submission meta
    const lastMeta = localStorage.getItem('edu_last_submission_meta');
    if (lastMeta) {
      try {
        setRecentSubmission(JSON.parse(lastMeta));
      } catch {}
    }
  }, []);

  if (loading) return (
    <div className="animate-pulse space-y-8">
      <div className="h-48 bg-slate-100 rounded-3xl"></div>
      <div className="h-64 bg-slate-100 rounded-3xl"></div>
    </div>
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="bg-blue-100 text-blue-900 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
            Portal Murid • Nineteen Exam
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-indigo-950 mt-2">
            Halo, {sessionUser?.nama || sessionUser?.name || 'Murid'}! 👋
          </h1>
          <p className="text-slate-500 text-sm font-medium">Selamat datang di ruang ujian digital. Pastikan kartu ujian Anda selalu siap.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Digital Student ID Card */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-950 text-white rounded-[2.5rem] p-7 shadow-xl shadow-indigo-950/20 relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                  <GraduationCap className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white leading-none">Nineteen Exam</h4>
                  <p className="text-[10px] text-slate-300 font-bold mt-0.5">SMAN 19 Bandung</p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
                Peserta Aktif
              </span>
            </div>

            {/* QR ID Box */}
            <div className="bg-white p-4 rounded-3xl shadow-inner flex flex-col items-center justify-center">
              <QRCodeSVG
                value={JSON.stringify({
                  nisn: sessionUser?.nisn || sessionUser?.code || '242510311',
                  nama: sessionUser?.nama || sessionUser?.name || 'Murid',
                  kelas: sessionUser?.kelas || sessionUser?.nama_kelas || 'XII'
                })}
                size={130}
                level="M"
              />
              <p className="font-mono text-xs font-black text-indigo-950 mt-2 tracking-wider">
                {sessionUser?.nisn || sessionUser?.code || '242510311'}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-2 text-xs bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Nama Murid:</span>
                <span className="font-bold text-white text-right">{sessionUser?.nama || sessionUser?.name || 'Murid'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Kelas / Jurusan:</span>
                <span className="font-bold text-blue-300">{sessionUser?.kelas || sessionUser?.nama_kelas || 'XII'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Mode Ujian:</span>
                <span className="font-bold text-emerald-400">Offline-First CBT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Exams & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Exams Card */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-950 flex items-center justify-center">
                  <Play className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-indigo-950">Jadwal Ujian Aktif</h3>
                  <p className="text-xs text-slate-400 font-medium">Ujian yang siap Anda kerjakan hari ini secara offline.</p>
                </div>
              </div>
            </div>

            {activeExams.length === 0 ? (
              <div className="py-12 text-center px-4 bg-slate-50/50 rounded-3xl border border-slate-100">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-black text-indigo-950">Belum Ada Ujian Terbuka</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 font-medium">
                  Ujian yang diterbitkan oleh guru Anda akan otomatis muncul di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="p-5 rounded-3xl border-2 border-slate-100 bg-white hover:border-indigo-950 transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                          {exam.subject || 'Mata Pelajaran'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {exam.duration_minutes || 60} Menit
                        </span>
                      </div>
                      <h4 className="text-base font-black text-indigo-950">{exam.title}</h4>
                      <p className="text-xs text-slate-400 font-medium">
                        Oleh: {exam.teacher_name || 'Guru Pengampu'} • Token: <span className="font-mono font-bold text-indigo-950">{exam.token || '-'}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/test/${exam.teacher_id || 'teacher'}/${exam.id}`)}
                      className="px-6 py-3 bg-indigo-950 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/20 active:scale-95 transition-all shrink-0"
                    >
                      <span>Mulai Ujian</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last Submission / Score Widget */}
          {recentSubmission && (
            <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-[2rem] p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Ujian Terakhir Selesai</span>
                  <h4 className="text-sm font-black text-indigo-950">{recentSubmission.examTitle}</h4>
                  <p className="text-xs text-slate-500 font-medium">Skor Pengerjaan: <strong className="text-emerald-700 font-black text-sm">{recentSubmission.score}</strong> / 100</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const qr = localStorage.getItem('edu_last_submission_qr');
                  if (qr) {
                    navigate('/exam/result/last');
                  }
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shrink-0 hover:bg-emerald-700 transition-all"
              >
                Lihat Barcode
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
