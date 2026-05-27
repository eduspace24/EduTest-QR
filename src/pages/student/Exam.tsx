import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertCircle,
  Loader2,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  WifiOff,
  ArrowRight,
  Check,
  CloudDownload,
  AlertTriangle,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { fetchExamFromUrl } from '../../lib/googleDrive';
import { addToPendingSubmissions, getCollectionData } from '../../lib/db';
import { packResult } from '../../lib/hash';

export default function StudentExam() {
  const { teacherId, examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [displayQuestions, setDisplayQuestions] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [cheatViolations, setCheatViolations] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [triggerCheatSubmit, setTriggerCheatSubmit] = useState(false);
  const [auditLog, setAuditLog] = useState<{time: string, action: string}[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('Menghubungkan ke server...');

  const [isJoined, setIsJoined] = useState(false);
  const [studentCode, setStudentCode] = useState('');
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [studentData, setStudentData] = useState({ nama: '', kelas: '', id: '' });
  const [allDbStudents, setAllDbStudents] = useState<any[]>([]);
  const [allDbClasses, setAllDbClasses] = useState<any[]>([]);

  useEffect(() => {
    const fetchDbData = async () => {
      try {
        const [studentsData, classesData] = await Promise.all([
          getCollectionData('students'),
          getCollectionData('classes')
        ]);
        setAllDbStudents(studentsData);
        setAllDbClasses(classesData);
      } catch (e) {
        console.error('Error fetching global student list:', e);
      }
    };
    fetchDbData();
  }, []);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    const hasProgress = localStorage.getItem(`answers_${examId}`);
    
    if (session.user?.role === 'siswa' && hasProgress) {
      setIsJoined(true);
      setStudentData(session.user);
    } else if (session.user?.role === 'siswa' && !hasProgress) {
      // If they are a student but no progress for THIS exam, force re-login
      localStorage.removeItem('edu_session');
      setIsJoined(false);
    }
    
    const loadExam = async () => {
      try {
        setLoading(true);
        setDownloadProgress(0);
        setDownloadStage('Menghubungkan ke server...');

        // Simulate progress while fetch is running
        progressRef.current = setInterval(() => {
          setDownloadProgress(prev => {
            if (prev < 25) return prev + 2;
            return prev;
          });
        }, 300);

        setDownloadStage('Mengunduh soal ujian...');
        const data = await fetchExamFromUrl(examId!);

        // Advance progress after data received
        if (progressRef.current) clearInterval(progressRef.current);
        setDownloadProgress(65);
        setDownloadStage('Memproses lembar ujian...');
        progressRef.current = setInterval(() => {
          setDownloadProgress(prev => {
            if (prev < 90) return prev + 3;
            return prev;
          });
        }, 100);

        setExam(data);
        
        const processQuestions = (questions: any[]) =>
          questions.map((q: any) => {
            if (data.randomize_options && q.options && q.options.length > 0) {
              const opts = [...q.options];
              for (let i = opts.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [opts[i], opts[j]] = [opts[j], opts[i]];
              }
              const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
              return {
                ...q,
                options: opts.map((opt: any, idx: number) => ({
                  ...opt,
                  label: labels[idx] || opt.label
                }))
              };
            }
            return q;
          });

        if (data.randomized) {
          const shuffled = processQuestions([...data.questions]);
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          setDisplayQuestions(shuffled);
        } else {
          setDisplayQuestions(processQuestions(data.questions));
        }
        
        // Restore progress
        const savedAnswers = localStorage.getItem(`answers_${examId}`);
        if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
        
        const savedLog = localStorage.getItem(`audit_${examId}`);
        if (savedLog) setAuditLog(JSON.parse(savedLog));

        // Restore or init timer
        const savedEndTime = localStorage.getItem(`timer_end_${examId}`);
        if (savedEndTime) {
          const remaining = Math.max(0, Math.floor((parseInt(savedEndTime) - Date.now()) / 1000));
          setTimeLeft(remaining);
        } else if (data?.duration) {
          setTimeLeft(data.duration * 60);
        }

        addAudit('Ujian Dimulai');

        // Complete progress immediately
        if (progressRef.current) clearInterval(progressRef.current);
        setDownloadStage('Lembar ujian siap!');
        setDownloadProgress(100);
      } catch (err) {
        if (progressRef.current) clearInterval(progressRef.current);
        setError('Gagal memuat ujian. Pastikan link benar dan file dapat diakses.');
      } finally {
        setTimeout(() => setLoading(false), 400);
      }
    };

    loadExam();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [examId]);

  // Timer countdown — only starts when student has joined and exam is loaded
  useEffect(() => {
    if (!isJoined || !exam || timeLeft <= 0) return;
    
    // Save deadline to localStorage so timer persists across refreshes
    if (!localStorage.getItem(`timer_end_${examId}`)) {
      localStorage.setItem(`timer_end_${examId}`, String(Date.now() + timeLeft * 1000));
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Auto-submit when time runs out
          submitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isJoined, exam]);

  const addAudit = (action: string) => {
    const entry = { time: new Date().toLocaleTimeString(), action };
    setAuditLog(prev => {
      const newLog = [...prev, entry];
      localStorage.setItem(`audit_${examId}`, JSON.stringify(newLog));
      return newLog;
    });
  };

  // Anti-Cheat: Visibility Change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        addAudit('Pindah Tab / Keluar Aplikasi');
        if (isJoined && exam?.anti_cheat) {
          setCheatViolations(prev => {
            const next = prev + 1;
            if (exam.cheat_tolerance !== 0 && next >= exam.cheat_tolerance) {
              setTriggerCheatSubmit(true);
            } else {
              setIsLocked(true);
            }
            return next;
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isJoined, exam?.anti_cheat, exam?.cheat_tolerance]);

  // Auto-submit when cheat tolerance exceeded (mode 1x/2x/3x)
  useEffect(() => {
    if (triggerCheatSubmit) {
      localStorage.setItem('edu_cheat_flagged', 'true');
      submitExam(true, false);
      setTriggerCheatSubmit(false);
    }
  }, [triggerCheatSubmit]);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: value };
      localStorage.setItem(`answers_${examId}`, JSON.stringify(next));
      return next;
    });
  };

  const submitExam = async (autoSubmit = false, skipNavigate = false) => {
    try {
      if (submitting) return;
      
      // 1. Alert Tahap 1
      if (!autoSubmit && !window.confirm('Yakin ingin mengumpulkan jawaban?')) return;

      setSubmitting(true);
      addAudit(autoSubmit ? 'Auto-Submit (Waktu Habis)' : (skipNavigate ? 'Blokir Curang' : 'Submit Manual'));
      
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      
      // 2. Cek Data Soal
      if (!exam?.questions) throw new Error("Aplikasi kehilangan data soal. Silakan Refresh (F5).");
      
      // 3. Kalkulasi Skor
      let correctAnswers = 0;
      exam.questions.forEach((q: any) => {
        // Cari kunci di dalam soal atau di kantong rahasia (_answer_key)
        let key = q.correct_answer || q.answer || q.correctAnswer;
        
        if (!key && exam?._answer_key) {
          const secretKey = exam._answer_key.find((k: any) => k.id === q.id);
          key = secretKey?.answer || secretKey?.correct_answer;
        }

        const studentAnswer = answers[q.id];
        if (studentAnswer && key && String(studentAnswer).trim().toUpperCase() === String(key).trim().toUpperCase()) {
          correctAnswers++;
        }
      });
      const score = Math.round((correctAnswers / exam.questions.length) * 100);

      // 4. Buat QR String
      const answersString = exam.questions.map((q: any) => answers[q.id] || '-').join('');
      const tabSwitches = auditLog.filter((log: any) => log.action.includes('Pindah Tab') || log.action.includes('Keluar')).length;
      
      const qrString = packResult({
        nama: session.user?.nama || session.user?.name || '-',
        kelas: session.user?.kelas || '-',
        code: session.user?.code || session.user?.id || '-',
        driveFileId: examId || '-',
        score,
        startTime: auditLog[0]?.time || '-',
        endTime: new Date().toLocaleTimeString(),
        tabSwitches,
        answersString,
        serverUrl: exam?.serverUrl || undefined,
        examTitle: exam?.title || undefined
      });

      // Simpan backup lokal & data QR
      localStorage.setItem(`submitted_${examId}`, qrString);
      localStorage.setItem('edu_last_submission_qr', qrString);
      localStorage.setItem('edu_last_submission_meta', JSON.stringify({
        examTitle: exam?.title || 'Ujian',
        studentName: session.user?.nama || session.user?.name || '-',
        studentKelas: session.user?.kelas || '-',
        score,
        totalQuestions: exam.questions.length,
        examLink: `/test/${teacherId}/${examId}`
      }));
      
      if (timerRef.current) clearInterval(timerRef.current);

      // Cleanup & Selesai
      if (!skipNavigate) {
        localStorage.removeItem(`answers_${examId}`);
        localStorage.removeItem(`audit_${examId}`);
        localStorage.removeItem(`timer_end_${examId}`);
        localStorage.removeItem('edu_session');
        navigate(`/exam/result/finish`);
      }
    } catch (err: any) {
      alert('Gagal menyelesaikan ujian: ' + err.message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = () => {
    const code = unlockInput.trim().toUpperCase();
    if (code === (exam?.unlock_code || '').toUpperCase()) {
      const wasAutoSubmitted = exam?.cheat_tolerance !== 0 && cheatViolations >= exam.cheat_tolerance;
      setIsLocked(false);
      setCheatViolations(0);
      setUnlockInput('');
      setUnlockError('');
      if (wasAutoSubmitted) {
        navigate(`/exam/result/finish`);
      }
    } else {
      setUnlockError('Kode unlock salah. Coba lagi atau hubungi pengawas.');
    }
  };

  const handleCheckCode = (code: string) => {
    const input = code.trim().toUpperCase();
    const cleanInput = input.replace('EDU-', '');
    setStudentCode(code);
    
    // 1. Try to find in allowedStudents first
    let student = exam?.allowedStudents?.find((s: any) => {
      const dbCode = s.code.trim().toUpperCase();
      const cleanDbCode = dbCode.replace('EDU-', '');
      return dbCode === input || cleanDbCode === cleanInput;
    });

    // 2. Fallback to global database if not in allowedStudents (helps with testing/class mismatches)
    if (!student && allDbStudents && allDbStudents.length > 0) {
      student = allDbStudents.find((s: any) => {
        const dbCode = s.code.trim().toUpperCase();
        const cleanDbCode = dbCode.replace('EDU-', '');
        return dbCode === input || cleanDbCode === cleanInput;
      });
    }

    if (student) {
      const className = student.className || 
                        allDbClasses.find((c: any) => c.id === student.classId)?.name || 
                        'Umum';
      setFoundStudent(student);
      setStudentData({
        nama: student.name,
        kelas: className, 
        id: student.id
      });
    } else {
      console.log('Code mismatch. Input:', input, 'Available codes:', exam?.allowedStudents?.map((s: any) => s.code) || []);
      setFoundStudent(null);
    }
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    
    const finalData = foundStudent ? {
      nama: foundStudent.name,
      kelas: foundStudent.className || 'Umum',
      id: foundStudent.id,
      code: foundStudent.code // ADDED THIS
    } : studentData;

    if (!finalData.nama || !finalData.kelas) return;
    
    const session = {
      user: { ...finalData, role: 'siswa' }
    };
    localStorage.setItem('edu_session', JSON.stringify(session));
    setIsJoined(true);
    addAudit('Ujian Dimulai (Identitas Diisi)');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md text-center">
        <div className="bg-indigo-950 text-white p-4 rounded-2xl w-fit mx-auto mb-6 shadow-lg">
          <CloudDownload className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-indigo-950 mb-2">Menyiapkan Lembar Ujian</h2>
        <p className="text-sm font-bold text-slate-400 mb-8">{downloadStage}</p>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <motion.div 
            className="h-full bg-indigo-950 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${downloadProgress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs font-bold text-slate-400 mt-3">{downloadProgress}%</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center">
        <WifiOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-indigo-950">{error}</h2>
        <button onClick={() => window.location.reload()} className="mt-6 bg-indigo-950 text-white px-8 py-3 rounded-xl font-bold">Coba Lagi</button>
      </div>
    </div>
  );

  if (isLocked) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-red-100 overflow-hidden"
      >
        <div className="h-3 bg-gradient-to-r from-red-500 to-rose-600" />
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-indigo-950 mb-2">Kamu Terblokir</h1>
          <p className="text-slate-500 text-sm font-bold mb-6">
            {exam?.cheat_tolerance === 0
              ? 'Kamu terdeteksi keluar tab. Hubungi pengawas untuk mendapatkan kode unlock agar bisa melanjutkan ujian.'
              : 'Kamu terdeteksi mencurang dengan keluar tab melebihi batas toleransi. Hubungi pengawas untuk mendapatkan kode unlock.'}
          </p>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
            <div className="text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kode Unlock</label>
              <div className="flex items-center gap-2 mt-1.5">
                <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={unlockInput}
                  onChange={(e) => { setUnlockInput(e.target.value); setUnlockError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
                  placeholder="Masukkan kode..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-indigo-950 outline-none focus:ring-2 focus:ring-blue-500/10 uppercase tracking-widest"
                  maxLength={6}
                />
              </div>
              {unlockError && (
                <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">{unlockError}</p>
              )}
            </div>
            <button
              onClick={handleUnlock}
              className="w-full bg-indigo-950 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-900 transition-all active:scale-95"
            >
              Buka Blokir
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  if (!isJoined) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10"
      >
        <div className="text-center mb-8">
          <div className="bg-indigo-950 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-indigo-950">{exam?.title || 'Memuat Judul...'}</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 px-6 py-2 bg-slate-50 rounded-xl inline-block">Siswa Silakan Masuk</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Kode Unik Siswa</label>
            <div className="relative">
              <input 
                type="text" required
                className={cn(
                  "w-full px-5 py-4 rounded-2xl border-2 outline-none transition-all font-mono text-lg font-black tracking-widest uppercase",
                  foundStudent ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 bg-slate-50 text-indigo-950 focus:border-indigo-950"
                )}
                placeholder="CONTOH: ADL-123"
                value={studentCode}
                onChange={(e) => handleCheckCode(e.target.value)}
              />
              {foundStudent && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-500 text-white p-1 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>
            {studentCode && !foundStudent && (
              <p className="text-[10px] font-bold text-rose-500 mt-1 ml-1 uppercase tracking-wider">Kode tidak terdaftar untuk ujian ini!</p>
            )}
          </div>

          <AnimatePresence>
            {foundStudent && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl space-y-1"
              >
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Identitas Terbaca:</p>
                <p className="text-lg font-black text-indigo-950">{foundStudent.name}</p>
                <p className="text-xs font-bold text-indigo-400 uppercase">KELAS: {studentData.kelas}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!foundStudent && (
            <div className="pt-4 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atau Isi Manual</p>
              <div className="mt-4 space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-indigo-950"
                    placeholder="Contoh: Budi Santoso"
                    value={studentData.nama}
                    onChange={(e) => setStudentData({ ...studentData, nama: e.target.value })}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelas</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-indigo-950"
                    placeholder="Contoh: XII IPA 1"
                    value={studentData.kelas}
                    onChange={(e) => setStudentData({ ...studentData, kelas: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={!foundStudent && (!studentData.nama || !studentData.kelas)}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-lg",
              foundStudent 
                ? "bg-indigo-950 text-white shadow-indigo-950/20" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            )}
          >
            Mulai Ujian <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-950 p-2 rounded-xl text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-indigo-950 leading-none uppercase tracking-tight">{exam?.title}</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Siswa: {studentData.nama} • {studentData.kelas}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 md:px-4 py-2 rounded-xl font-bold text-xs md:text-sm">
              <Clock className="w-4 h-4" />
              <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
            <button 
              onClick={submitExam}
              disabled={submitting}
              className="bg-indigo-950 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-indigo-950/20 flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Selesai
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex gap-2">
            {displayQuestions.map((_: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={cn(
                  "w-10 h-10 rounded-xl font-black text-sm transition-all",
                  currentQuestionIndex === idx 
                    ? "bg-indigo-950 text-white shadow-lg" 
                    : answers[displayQuestions[idx].id] 
                      ? "bg-emerald-50 text-emerald-600 border-2 border-emerald-100" 
                      : "bg-white text-slate-400 border-2 border-slate-100"
                )}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-950/5 border border-slate-100 p-12"
        >
          <div className="mb-8">
            <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
              Pertanyaan {currentQuestionIndex + 1} Dari {displayQuestions.length}
            </span>
            <h2 className="text-2xl font-bold text-indigo-950 mt-6 leading-relaxed">
              {displayQuestions[currentQuestionIndex].question_text}
            </h2>
            {displayQuestions[currentQuestionIndex].image_url && (
              <div className="mt-6 rounded-3xl overflow-hidden border border-slate-100 bg-slate-50/50">
                <img 
                  src={displayQuestions[currentQuestionIndex].image_url} 
                  alt="Question Attachment" 
                  className="w-full max-h-[500px] object-contain mx-auto"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            {(displayQuestions[currentQuestionIndex].options || []).map((opt: any) => (
              <label 
                key={opt.id}
                className={cn(
                  "flex items-center gap-4 p-6 rounded-3xl border-2 cursor-pointer transition-all active:scale-[0.98]",
                  answers[displayQuestions[currentQuestionIndex].id] === opt.id
                    ? "border-indigo-950 bg-indigo-50/50"
                    : "border-slate-100 bg-white hover:border-slate-200"
                )}
              >
                <input 
                  type="radio" 
                  className="hidden" 
                  name={`q-${currentQuestionIndex}`}
                  checked={answers[displayQuestions[currentQuestionIndex].id] === opt.id}
                  onChange={() => handleAnswer(displayQuestions[currentQuestionIndex].id, opt.id)}
                />
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center font-black",
                  answers[displayQuestions[currentQuestionIndex].id] === opt.id
                    ? "bg-indigo-950 text-white"
                    : "bg-slate-100 text-slate-500"
                )}>{opt.label}</div>
                <span className="font-bold text-indigo-950">{opt.text}</span>
              </label>
            ))}
          </div>
        </motion.div>

        <div className="mt-10 flex justify-between items-center">
          <button 
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            className="flex items-center gap-2 font-black text-indigo-950 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" /> Sebelumnya
          </button>
          
          <button 
            disabled={currentQuestionIndex === displayQuestions.length - 1}
            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
            className="flex items-center gap-2 font-black text-indigo-950 disabled:opacity-30"
          >
            Selanjutnya <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}
