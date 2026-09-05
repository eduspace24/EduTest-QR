import { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  ArrowRight,
  BookOpen,
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
import { supabase } from '../../lib/supabase';
import { getCollectionData } from '../../lib/db';
import { cn, formatStudentName, formatTeacherName } from '../../lib/utils';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [activeExams, setActiveExams] = useState<any[]>([]);
  const [recentSubmission, setRecentSubmission] = useState<any>(null);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());

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
        let allExams: any[] = [];

        // 1. Appwrite (Online sync if available)
        try {
          const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../../lib/appwrite');
          const res = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.EXAMS,
            [Query.equal('status', 'active'), Query.orderDesc('$createdAt'), Query.limit(100)]
          );

          if (res && res.documents && res.documents.length > 0) {
            allExams = res.documents.map(d => ({
              ...d,
              id: d.$id,
              created_at: d.$createdAt
            }));
          }
        } catch {}

        // 2. Local IndexedDB Cache (both exams_list and exams)
        const [localExamsList, localRawExams] = await Promise.all([
          getCollectionData('exams_list'),
          getCollectionData('exams')
        ]);

        const combinedLocal = [...(localExamsList || []), ...(localRawExams || [])];
        const localMap = new Map<string, any>();
        for (const item of combinedLocal) {
          if (item && item.id) {
            localMap.set(item.id, { ...(localMap.get(item.id) || {}), ...item });
          }
        }

        // Merge Appwrite with local rich fields (targetClasses, targetClassNames, etc.)
        if (allExams.length > 0) {
          allExams = allExams.map((appwriteExam: any) => {
            const local = localMap.get(appwriteExam.id) || {};
            return {
              ...local,
              ...appwriteExam,
              targetClasses: local.targetClasses || appwriteExam.targetClasses || [],
              targetClassNames: local.targetClassNames || appwriteExam.targetClassNames || [],
              exam_type: local.exam_type || appwriteExam.exam_type || 'semester',
              session_name: local.session_name || appwriteExam.session_name || '',
              start_time: local.start_time || appwriteExam.start_time || '',
              end_time: local.end_time || appwriteExam.end_time || ''
            };
          });
        }

        // Add any local exams not in Appwrite
        const existingIds = new Set(allExams.map((e: any) => e.id));
        for (const [id, localItem] of localMap.entries()) {
          if (!existingIds.has(id)) {
            allExams.push(localItem);
            existingIds.add(id);
          }
        }

        // 3. Filter by Active status
        const activeOnly = allExams.filter((exam: any) => {
          if (!exam) return false;
          const status = exam.status || (exam.is_active ? 'active' : 'draft');
          return status === 'active';
        });

        // 4. Accurate Target Class Filtering based on current student's class
        const studentClass = (user.kelas || user.nama_kelas || '').trim();
        const studentGrade = studentClass.startsWith('XII') ? 'XII' : studentClass.startsWith('XI') ? 'XI' : studentClass.startsWith('X') ? 'X' : '';

        const targeted = activeOnly.filter((exam: any) => {
          const hasTargetClasses = Array.isArray(exam.targetClasses) && exam.targetClasses.length > 0;
          const hasTargetClassNames = Array.isArray(exam.targetClassNames) && exam.targetClassNames.length > 0;

          // If specific target classes are defined, student MUST belong to one of those classes
          if (hasTargetClasses || hasTargetClassNames) {
            if (hasTargetClassNames) {
              const hasMatchName = exam.targetClassNames.some((cnStr: string) => {
                const cnNorm = String(cnStr).trim().toLowerCase();
                const stNorm = studentClass.toLowerCase();
                return cnNorm === stNorm || cnNorm.replace(/[\s-]+/g, '') === stNorm.replace(/[\s-]+/g, '');
              });
              if (hasMatchName) return true;
            }

            if (hasTargetClasses) {
              const hasMatchId = exam.targetClasses.some((tcId: string) => {
                const tcNorm = String(tcId).toLowerCase().replace(/^(cls_|class_)/, '').replace(/[\s-]+/g, '_');
                const stNorm = studentClass.toLowerCase().replace(/[\s-]+/g, '_');
                return tcNorm === stNorm || tcNorm.includes(stNorm) || String(tcId).toLowerCase() === studentClass.toLowerCase();
              });
              if (hasMatchId) return true;
            }

            // Also check allowedStudents array if available
            if (Array.isArray(exam.allowedStudents) && exam.allowedStudents.length > 0) {
              const isListed = exam.allowedStudents.some((s: any) => 
                (s.nisn && s.nisn === user.nisn) || 
                (s.code && (s.code === user.nisn || s.code === user.code)) ||
                (s.nama && s.nama.toLowerCase() === (user.nama || user.name || '').toLowerCase())
              );
              if (isListed) return true;
            }

            return false;
          }

          // If no specific classes are chosen, check grade restriction
          if (exam.targetGrade && exam.targetGrade !== 'ALL') {
            return Boolean(studentGrade && exam.targetGrade.toUpperCase() === studentGrade.toUpperCase());
          }

          // Open to all if neither targetClasses nor targetGrade is set
          return true;
        });

        setActiveExams(targeted);

        // Check which exams this student has already finished
        const doneSet = new Set<string>();
        const studentCodeVal = user.nisn || user.code || user.id || '';
        const studentNameVal = (user.nama || user.name || '').trim().toLowerCase();

        // 1. IndexedDB results
        try {
          const localResults = (await getCollectionData('results')) || [];
          for (const r of localResults) {
            const isMe = (studentCodeVal && (r.student_code === studentCodeVal || r.student?.code === studentCodeVal)) ||
                         (studentNameVal && (r.student_name?.toLowerCase() === studentNameVal || r.student?.nama?.toLowerCase() === studentNameVal));
            if (isMe) {
              if (r.driveFileId) doneSet.add(r.driveFileId);
              if (r.exam_title) doneSet.add(r.exam_title.trim().toLowerCase());
            }
          }
        } catch {}

        // 2. Appwrite Cloud results
        try {
          const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../../lib/appwrite');
          if (studentCodeVal) {
            const cloudRes = await databases.listDocuments(
              APPWRITE_DATABASE_ID,
              COLLECTIONS.EXAM_RESULTS,
              [Query.equal('student_code', studentCodeVal), Query.limit(50)]
            );
            if (cloudRes && cloudRes.documents) {
              for (const d of cloudRes.documents) {
                if (d.driveFileId) doneSet.add(d.driveFileId);
                if (d.exam_title) doneSet.add(d.exam_title.trim().toLowerCase());
              }
            }
          }
        } catch {}

        setCompletedKeys(doneSet);
      } catch (err) {
        console.error('Error fetching student exams:', err);
        setActiveExams([]);
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
            Halo, {formatStudentName(sessionUser?.nama || sessionUser?.name || 'Murid')}! 👋
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
                <div className="w-9 h-9 rounded-xl bg-indigo-900/70 flex items-center justify-center border border-white/10">
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

            {/* Student ID Badge (Tanpa QR Code) */}
            <div className="bg-indigo-900/60 p-6 rounded-3xl border border-white/15 flex flex-col items-center justify-center text-center space-y-3 shadow-inner">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/30 border-2 border-white/20">
                {(sessionUser?.nama || sessionUser?.name || 'M').charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block">Nomor Induk / NISN</span>
                <p className="font-mono text-sm font-black text-white tracking-widest mt-0.5">
                  {sessionUser?.nisn || sessionUser?.code || '242510311'}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-xs bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Nama Murid:</span>
                <span className="font-bold text-white text-right">{formatStudentName(sessionUser?.nama || sessionUser?.name || 'Murid')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">No. Peserta:</span>
                <span className="font-mono font-bold text-amber-300">
                  {sessionUser?.nomor_peserta || `2627-${(sessionUser?.kelas || 'XII').replace(/\s+/g, '')}-0${((sessionUser?.id || 1) % 36) + 1}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Kelas / Jurusan:</span>
                <span className="font-bold text-blue-300">{sessionUser?.kelas || sessionUser?.nama_kelas || 'XII'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Ruang Ujian:</span>
                <span className="font-bold text-emerald-300">
                  {sessionUser?.ruang_ujian || `Ruang 0${((sessionUser?.id || 1) % 12) + 1}`}
                </span>
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
                {activeExams.map((exam) => {
                  const isDone = completedKeys.has(exam.id) || 
                                 completedKeys.has(exam.driveFileId) || 
                                 (exam.title && completedKeys.has(exam.title.trim().toLowerCase())) ||
                                 Boolean(localStorage.getItem(`submitted_${exam.id}`)) ||
                                 Boolean(localStorage.getItem(`submitted_${exam.driveFileId}`));

                  return (
                    <div
                      key={exam.id}
                      className={cn(
                        "p-5 rounded-3xl border-2 transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 group",
                        isDone ? "bg-slate-50/70 border-emerald-100" : "bg-white border-slate-100 hover:border-indigo-950"
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                            exam.exam_type === 'semester'
                              ? "bg-purple-100 text-purple-900 border border-purple-200"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                          )}>
                            {exam.exam_type === 'semester' ? '🏛️ Ujian Semester' : '📝 Ulangan Harian'}
                          </span>
                          
                          <span className="bg-indigo-100 text-indigo-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                            {exam.subject || 'Mata Pelajaran'}
                          </span>

                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {exam.duration_minutes || exam.duration || 60} Menit
                          </span>

                          {exam.exam_type === 'semester' && exam.session_name && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                              {exam.session_name}
                            </span>
                          )}

                          {exam.exam_type !== 'semester' && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                              Fleksibel (Aktif)
                            </span>
                          )}

                          {isDone && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai 1x
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-black text-indigo-950">{exam.title}</h4>
                        <p className="text-xs text-slate-400 font-medium">
                          Oleh: {formatTeacherName(exam.teacher_name || 'Guru Pengampu')}
                          {exam.exam_type === 'semester'
                            ? (exam.start_time ? ` • Pkl ${exam.start_time} - ${exam.end_time || ''}` : '')
                            : ' • Waktu Bebas (1x Pengerjaan)'}
                        </p>
                      </div>

                      {isDone ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-4 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black rounded-2xl flex items-center gap-1.5 shadow-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sudah Selesai
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate('/exam/result/finish')}
                            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                            title="Lihat Bukti QR Hasil Ujian"
                          >
                            Bukti QR
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/test/${exam.teacher_id || 'teacher'}/${exam.id}`)}
                          className="px-6 py-3 bg-indigo-950 hover:bg-indigo-900 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                        >
                          <span>Mulai Ujian</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}
                    </div>
                  );
                })}
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
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {recentSubmission.show_score === false ? (
                      <span className="text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded text-[10px] font-bold">
                        🔒 Nilai Dirahasiakan oleh Guru
                      </span>
                    ) : (
                      <>Skor Pengerjaan: <strong className="text-emerald-700 font-black text-sm">{recentSubmission.score}</strong> / 100</>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  navigate('/exam/result/finish');
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shrink-0 hover:bg-emerald-700 transition-all cursor-pointer"
              >
                {recentSubmission.submission_mode === 'direct' ? 'Bukti Selesai' : 'Lihat Barcode'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
