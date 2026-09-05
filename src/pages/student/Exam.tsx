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
  KeyRound,
  GripVertical,
  Layers,
  Sparkles,
  CheckSquare,
  Type,
  Maximize,
  Minimize,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '../../lib/utils';
import { addToPendingSubmissions, getCollectionData, saveCollection } from '../../lib/db';
import { packResult } from '../../lib/hash';
import { supabase } from '../../lib/supabase';

export default function StudentExam() {
  const { teacherId, examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
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
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [completionData, setCompletionData] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('Menghubungkan ke server...');

  const [isJoined, setIsJoined] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [showNumberGrid, setShowNumberGrid] = useState(false);
  const [studentCode, setStudentCode] = useState('');
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [studentData, setStudentData] = useState({ nama: '', kelas: '', id: '' });
  const [allDbStudents, setAllDbStudents] = useState<any[]>([]);

  const enterFullscreen = () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if ((docEl as any).webkitRequestFullscreen) {
        (docEl as any).webkitRequestFullscreen();
      } else if ((docEl as any).msRequestFullscreen) {
        (docEl as any).msRequestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen error:', e);
    }
  };

  const exitFullscreen = () => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    } catch (e) {
      console.warn('Exit fullscreen error:', e);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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
    const isStudent = session.user && (session.user.role === 'siswa' || session.user.role === 'murid');

    // 1. Check direct local submission flag
    const localSubmitted = localStorage.getItem(`submitted_${examId}`);
    const localMeta = localStorage.getItem(`submission_meta_${examId}`);
    if (localSubmitted) {
      setAlreadyCompleted(true);
      if (localMeta) {
        try { setCompletionData(JSON.parse(localMeta)); } catch {}
      }
    }
    
    if (isStudent) {
      const studentName = session.user.nama || session.user.name || '';
      const studentKelas = session.user.nama_kelas || session.user.kelas || '';
      const studentCodeVal = session.user.nisn || session.user.code || session.user.id || '';
      
      setStudentData({
        nama: studentName,
        kelas: studentKelas,
        id: session.user.id || studentCodeVal,
        code: studentCodeVal
      });
      setStudentCode(studentCodeVal);

      if (hasProgress) {
        setIsJoined(true);
      }
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
        let data: any = null;

        // 1. Fetch from Appwrite Cloud (Primary online CBT source)
        try {
          const { databases, COLLECTIONS, APPWRITE_DATABASE_ID } = await import('../../lib/appwrite');
          const cloudDoc = await databases.getDocument(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.EXAMS,
            examId
          );
          if (cloudDoc) {
            data = cloudDoc;
          }
        } catch (appwriteErr) {
          console.warn('Appwrite direct getDocument note:', appwriteErr);
        }

        // 2. Fallback: Check local exam payload (offline cache)
        if (!data || !data.questions) {
          const single = await getCollectionData('exam_' + examId);
          if (single) {
            const singleObj = Array.isArray(single) ? single[0] : single;
            data = { ...(data || {}), ...singleObj };
          }
        }

        // 3. Fallback: Check local exams list
        if (!data) {
          const localExams = await getCollectionData('exams_list');
          data = localExams?.find((e: any) => e.id === examId || e.driveFileId === examId);
        }

        // 4. Fallback: Check local raw exams
        if (!data) {
          const rawExams = await getCollectionData('exams');
          data = rawExams?.find((e: any) => e.id === examId || e.driveFileId === examId);
        }

        // 5. Fallback: Check Supabase
        if (!data) {
          try {
            const { data: supaExam, error: sErr } = await supabase.from('exams').select('*').eq('id', examId).single();
            if (!sErr && supaExam) {
              data = supaExam;
            }
          } catch {}
        }

        if (!data) {
          throw new Error('Soal ujian tidak ditemukan atau telah ditutup oleh guru.');
        }

        // If questions is a string (from Appwrite or serialized payload), parse it
        if (data && typeof data.questions === 'string') {
          try {
            const parsed = JSON.parse(data.questions);
            if (Array.isArray(parsed)) {
              data.questions = parsed;
            } else if (parsed && typeof parsed === 'object') {
              data.questions = parsed.questions || [];
              if (parsed._answer_key && !data._answer_key) data._answer_key = parsed._answer_key;
              if (parsed.targetClasses && !data.targetClasses) data.targetClasses = parsed.targetClasses;
              if (parsed.targetClassNames && !data.targetClassNames) data.targetClassNames = parsed.targetClassNames;
              if (parsed.unlock_code && !data.unlock_code) data.unlock_code = parsed.unlock_code;
              if (parsed.cheat_tolerance !== undefined && data.cheat_tolerance === undefined) data.cheat_tolerance = parsed.cheat_tolerance;
              if (parsed.anti_cheat !== undefined && data.anti_cheat === undefined) data.anti_cheat = parsed.anti_cheat;
              if (parsed.show_score !== undefined) data.show_score = parsed.show_score;
              if (parsed.submission_mode !== undefined) data.submission_mode = parsed.submission_mode;
              if (parsed.duration && !data.duration) data.duration = parsed.duration;
            }
          } catch (jsonErr) {
            console.error('Error parsing cloud questions JSON:', jsonErr);
          }
        }

        // If data still has no questions, try getting questions from local exam_<id>
        if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
          const single = await getCollectionData('exam_' + examId);
          const singleObj = Array.isArray(single) ? single[0] : single;
          if (singleObj && singleObj.questions && Array.isArray(singleObj.questions) && singleObj.questions.length > 0) {
            data.questions = singleObj.questions;
            if (!data._answer_key && singleObj._answer_key) {
              data._answer_key = singleObj._answer_key;
            }
            if (singleObj.show_score !== undefined && data.show_score === undefined) data.show_score = singleObj.show_score;
            if (singleObj.submission_mode !== undefined && data.submission_mode === undefined) data.submission_mode = singleObj.submission_mode;
          }
        }

        if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error('Soal ujian kosong atau tidak dapat diuraikan.');
        }

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
        
        const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
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
          const shuffled = processQuestions([...rawQuestions]);
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          setDisplayQuestions(shuffled);
        } else {
          setDisplayQuestions(processQuestions(rawQuestions));
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

        // Check if student has already completed this exam in IndexedDB or Appwrite
        const studentCodeVal = session.user?.nisn || session.user?.code || session.user?.id || '';
        const studentNameVal = session.user?.nama || session.user?.name || '';
        
        if (studentCodeVal || studentNameVal) {
          try {
            const results = (await getCollectionData('results')) || [];
            const found = results.find((r: any) => 
              (r.driveFileId === examId || (r.exam_title && data?.title && r.exam_title.trim().toLowerCase() === data.title.trim().toLowerCase())) &&
              ((studentCodeVal && (r.student_code === studentCodeVal || r.student?.code === studentCodeVal)) ||
               (studentNameVal && (r.student_name?.toLowerCase() === studentNameVal.toLowerCase() || r.student?.nama?.toLowerCase() === studentNameVal.toLowerCase())))
            );
            if (found) {
              setAlreadyCompleted(true);
              setCompletionData(found);
            } else {
              // Also check Appwrite Cloud
              const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../../lib/appwrite');
              if (studentCodeVal) {
                const cloudRes = await databases.listDocuments(
                  APPWRITE_DATABASE_ID,
                  COLLECTIONS.EXAM_RESULTS,
                  [Query.equal('student_code', studentCodeVal), Query.limit(50)]
                );
                const cloudFound = cloudRes?.documents?.find((d: any) => 
                  d.driveFileId === examId || (d.exam_title && data?.title && d.exam_title.trim().toLowerCase() === data.title.trim().toLowerCase())
                );
                if (cloudFound) {
                  setAlreadyCompleted(true);
                  setCompletionData(cloudFound);
                }
              }
            }
          } catch (e) {
            console.warn('Completed check note:', e);
          }
        }

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

  const handleAnswer = (questionId: string, value: any) => {
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
      
      // 3. Kalkulasi Skor Lengkap untuk Semua Jenis Soal
      let totalEarnedScore = 0;
      exam.questions.forEach((q: any) => {
        let key = q.correct_answer || q.answer || q.correctAnswer;
        
        if (!key && exam?._answer_key) {
          const secretKey = exam._answer_key.find((k: any) => k.id === q.id);
          key = secretKey?.answer || secretKey?.correct_answer;
        }

        const studentAnswer = answers[q.id];
        const type = q.question_type || q.type || 'Pilihan Ganda';

        if (!studentAnswer) return;

        if (type === 'Pilihan Ganda' || type === 'Pilihan Ganda Asosiatif (TKA)' || type === 'Hubungan Sebab Akibat (TKA)') {
          if (key && String(studentAnswer).trim().toUpperCase() === String(key).trim().toUpperCase()) {
            totalEarnedScore += 1;
          }
        } else if (type === 'Pilihan Ganda Kompleks') {
          const keyArr = String(key || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).sort();
          const stuArr = (Array.isArray(studentAnswer) ? studentAnswer : String(studentAnswer || '').split(',')).map((s: string) => String(s).trim().toLowerCase()).filter(Boolean).sort();
          if (keyArr.length > 0 && keyArr.join(',') === stuArr.join(',')) {
            totalEarnedScore += 1;
          }
        } else if (type === 'Isian Singkat') {
          const validSynonyms = String(key || '').split('|').map(s => s.trim().toLowerCase()).filter(Boolean);
          const stuVal = String(studentAnswer || '').trim().toLowerCase();
          if (validSynonyms.length > 0 && validSynonyms.includes(stuVal)) {
            totalEarnedScore += 1;
          }
        } else if (type === 'Drag and Drop') {
          const keySeq = String(key || 'a,b,c,d').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          const stuSeq = (Array.isArray(studentAnswer) ? studentAnswer : String(studentAnswer || '').split(',')).map((s: string) => String(s).trim().toLowerCase()).filter(Boolean);
          if (keySeq.length > 0 && keySeq.join(',') === stuSeq.join(',')) {
            totalEarnedScore += 1;
          }
        } else if (type === 'Menjodohkan') {
          let stuMap: Record<string, string> = {};
          if (typeof studentAnswer === 'object') {
            stuMap = studentAnswer;
          } else {
            try { stuMap = JSON.parse(studentAnswer); } catch {}
          }
          const pairs = (q.options || []).map((opt: any, idx: number) => {
            const parts = String(opt.text || '').split('=');
            return {
              id: opt.id || idx,
              left: parts[0]?.trim() || '',
              right: parts.slice(1).join('=').trim() || ''
            };
          }).filter((p: any) => p.left && p.right);

          if (pairs.length > 0) {
            let correctCount = 0;
            pairs.forEach((p: any) => {
              const matched = stuMap[p.id] || stuMap[p.left];
              if (matched && matched.trim().toLowerCase() === p.right.trim().toLowerCase()) {
                correctCount++;
              }
            });
            totalEarnedScore += correctCount / pairs.length;
          }
        }
      });
      const score = Math.round((totalEarnedScore / exam.questions.length) * 100);

      // 4. Buat QR String
      const answersString = exam.questions.map((q: any) => {
        const ans = answers[q.id];
        if (!ans) return '-';
        if (typeof ans === 'object') return 'O';
        const str = String(ans).trim();
        return str.length === 1 ? str.toUpperCase() : 'V';
      }).join('');

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
      localStorage.setItem(`submission_meta_${examId}`, JSON.stringify({
        examTitle: exam?.title || 'Ujian',
        studentName: session.user?.nama || session.user?.name || '-',
        studentKelas: session.user?.kelas || '-',
        score,
        show_score: exam?.show_score !== false,
        submission_mode: exam?.submission_mode || 'hybrid',
        completedAt: new Date().toISOString()
      }));
      localStorage.setItem('edu_last_submission_qr', qrString);
      localStorage.setItem('edu_last_submission_meta', JSON.stringify({
        examTitle: exam?.title || 'Ujian',
        studentName: session.user?.nama || session.user?.name || '-',
        studentKelas: session.user?.kelas || '-',
        score,
        show_score: exam?.show_score !== false,
        submission_mode: exam?.submission_mode || 'hybrid',
        totalQuestions: exam.questions.length,
        examLink: `/test/${teacherId}/${examId}`
      }));

      // Simpan juga ke koleksi 'results' di IndexedDB
      try {
        const existingResults = (await getCollectionData('results')) || [];
        const studentCodeVal = session.user?.code || session.user?.nisn || session.user?.id || '-';
        const studentNameVal = session.user?.nama || session.user?.name || '-';
        const newResult = {
          id: 'res_' + Date.now(),
          driveFileId: examId,
          exam_title: exam?.title || 'Ujian',
          student_name: studentNameVal,
          student_class: session.user?.kelas || session.user?.nama_kelas || '-',
          student_code: studentCodeVal,
          score: Number(score) || 0,
          answers_summary: answersString,
          tab_switches: Number(tabSwitches) || 0,
          start_time: auditLog[0]?.time || '-',
          end_time: new Date().toLocaleTimeString(),
          created_at: new Date().toISOString()
        };
        const updatedResults = [newResult, ...existingResults.filter((r: any) => 
          !(r.driveFileId === examId && (r.student_code === studentCodeVal || r.student_name === studentNameVal))
        )];
        await saveCollection('results', updatedResults);
      } catch (localResErr) {
        console.warn('Local results save note:', localResErr);
      }

      // Simpan juga ke Appwrite Cloud 'exam_results'
      try {
        const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, ID } = await import('../../lib/appwrite');
        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.EXAM_RESULTS,
          ID.unique(),
          {
            exam_title: exam?.title || 'Ujian',
            student_name: session.user?.nama || session.user?.name || '-',
            student_class: session.user?.kelas || session.user?.nama_kelas || '-',
            student_code: session.user?.code || session.user?.nisn || session.user?.id || '-',
            score: Number(score) || 0,
            answers_summary: answersString,
            tab_switches: Number(tabSwitches) || 0,
            start_time: auditLog[0]?.time || '-',
            end_time: new Date().toLocaleTimeString()
          }
        );
      } catch (cloudErr) {
        console.warn('Appwrite submission sync note:', cloudErr);
      }
      
      if (timerRef.current) clearInterval(timerRef.current);

      // Cleanup & Selesai
      if (!skipNavigate) {
        localStorage.removeItem(`answers_${examId}`);
        localStorage.removeItem(`audit_${examId}`);
        localStorage.removeItem(`timer_end_${examId}`);
        // Jaga sesi login murid tetap aktif!
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
    enterFullscreen();
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

  if (alreadyCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 text-center"
        >
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Sudah Selesai Dikerjakan
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-indigo-950 mt-3 mb-2">{exam?.title || 'Ujian'}</h2>
          <p className="text-xs text-slate-500 font-bold mb-6 leading-relaxed">
            Anda telah menyelesaikan ujian ini. Setiap murid hanya diperbolehkan mengerjakan satu kali saja dan jawaban Anda telah tercatat rapi di sistem.
          </p>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2 mb-6 text-left">
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Nama Peserta:</span>
              <span className="font-bold text-indigo-950">{completionData?.student_name || completionData?.studentName || studentData.nama || 'Peserta'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Kelas:</span>
              <span className="font-bold text-indigo-950">{completionData?.student_class || completionData?.studentKelas || studentData.kelas || '-'}</span>
            </div>
            {completionData?.score !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Nilai Akhir:</span>
                {(completionData?.show_score === false || exam?.show_score === false) ? (
                  <span className="font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded text-[11px]">
                    🔒 Dirahasiakan oleh Guru
                  </span>
                ) : (
                  <span className="font-black text-emerald-600 text-sm">
                    {completionData.score} / 100
                  </span>
                )}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Status Pengerjaan:</span>
              <span className="font-bold text-emerald-600">1x (Terkunci)</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="w-full py-3.5 bg-indigo-950 hover:bg-indigo-900 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-950/20 active:scale-95 transition-all cursor-pointer"
            >
              Kembali ke Beranda Murid
            </button>
            <button
              onClick={() => navigate('/exam/result/finish')}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs active:scale-95 transition-all cursor-pointer"
            >
              {(completionData?.submission_mode === 'direct' || exam?.submission_mode === 'direct')
                ? 'Lihat Bukti Pengiriman Langsung'
                : 'Lihat Bukti QR Hasil Ujian'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isJoined) {
    const isLoggedInStudent = Boolean(studentData.nama && studentData.kelas);

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-6 sm:p-10 space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="bg-indigo-950 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-950/20">
              <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              <span className="bg-indigo-100 text-indigo-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                {exam?.subject || 'Mata Pelajaran'}
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> CBT Siap
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight">{exam?.title || 'Memuat Lembar Ujian...'}</h2>
            <p className="text-slate-400 text-xs font-semibold">
              Pastikan identitas Anda sudah sesuai sebelum menekan tombol mulai.
            </p>
          </div>

          {/* If Logged In as Student */}
          {isLoggedInStudent ? (
            <div className="space-y-5">
              {/* Verified Identity Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-blue-50/50 border border-indigo-100 flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-white flex items-center justify-center font-black text-base shrink-0 shadow-md shadow-indigo-950/15">
                  {studentData.nama.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-indigo-950 truncate mt-0.5">{studentData.nama}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap mt-0.5">
                    <span>Kelas: <strong className="text-indigo-950">{studentData.kelas}</strong></span>
                    {studentCode && <span>• NISN: <strong className="font-mono text-indigo-950">{studentCode}</strong></span>}
                  </div>
                </div>
              </div>

              {/* Exam Specs Box */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Durasi</p>
                  <p className="text-xs sm:text-sm font-black text-indigo-950 flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" /> {exam?.duration || 60}m
                  </p>
                </div>
                <div className="space-y-0.5 border-x border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Jumlah Soal</p>
                  <p className="text-xs sm:text-sm font-black text-indigo-950">
                    {displayQuestions.length || exam?.questions?.length || 0} Butir
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Anti-Curang</p>
                  <p className="text-xs sm:text-sm font-black text-emerald-700">
                    {exam?.anti_cheat ? `${exam.cheat_tolerance || 3}x Max` : 'Standar'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const session = {
                    user: { ...studentData, role: 'siswa', code: studentCode || studentData.id }
                  };
                  localStorage.setItem('edu_session', JSON.stringify(session));
                  enterFullscreen();
                  setIsJoined(true);
                  addAudit('Ujian Dimulai (Portal Siswa)');
                }}
                className="w-full py-4 rounded-2xl font-black text-base sm:text-lg bg-indigo-950 hover:bg-indigo-900 text-white transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-950/20 active:scale-[0.98] cursor-pointer"
              >
                <span>Mulai Kerjakan Ujian Sekarang</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-[11px] text-center text-slate-400 font-medium">
                Waktu pengerjaan akan mulai dihitung mundur begitu Anda menekan tombol di atas.
              </p>
            </div>
          ) : (
            /* If Guest / Direct Link */
            <form onSubmit={handleJoin} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nama Lengkap Murid</label>
                <input 
                  type="text" 
                  required
                  placeholder="Masukkan nama lengkap Anda..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-950/10 focus:border-indigo-950"
                  value={studentData.nama}
                  onChange={(e) => setStudentData({ ...studentData, nama: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Kelas / Rombel</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: X-A atau XII-IPA"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-950/10 focus:border-indigo-950"
                    value={studentData.kelas}
                    onChange={(e) => setStudentData({ ...studentData, kelas: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">NISN / No. Peserta</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 242510311"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-950/10 focus:border-indigo-950 font-mono"
                    value={studentCode}
                    onChange={(e) => {
                      setStudentCode(e.target.value);
                      handleCheckCode(e.target.value);
                    }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={!studentData.nama || !studentData.kelas}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-3 shadow-lg mt-2",
                  studentData.nama && studentData.kelas
                    ? "bg-indigo-950 text-white shadow-indigo-950/20 hover:bg-indigo-900 cursor-pointer active:scale-[0.98]" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                )}
              >
                Masuk & Mulai Ujian <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-28 select-none">
      {/* Top Navbar Minimalis & Fokus */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 transition-all">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-950 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-indigo-950/15">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-indigo-950 text-sm sm:text-base tracking-tight truncate">
                {exam?.title || 'Ujian Sekolah'}
              </h1>
              <p className="text-[11px] font-bold text-slate-400 truncate">
                {studentData.nama} • <span className="text-indigo-950">{studentData.kelas}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Tombol Buka Nomor Soal Grid */}
            <button
              type="button"
              onClick={() => setShowNumberGrid(prev => !prev)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer",
                showNumberGrid 
                  ? "bg-indigo-950 text-white shadow-md shadow-indigo-950/20" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              )}
              title="Daftar Nomor Soal"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Nomor Soal</span>
            </button>

            {/* Timer Badge */}
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 text-rose-600 px-3 sm:px-4 py-2 rounded-xl font-black text-xs sm:text-sm shadow-xs">
              <Clock className="w-4 h-4 text-rose-500 animate-pulse" />
              <span className="font-mono font-bold tracking-tight">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Selesai / Kumpulkan Button */}
            <button 
              onClick={submitExam}
              disabled={submitting}
              className="bg-indigo-950 hover:bg-indigo-900 text-white px-4 sm:px-6 py-2 rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-indigo-950/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Selesai</span>
            </button>
          </div>
        </div>
      </header>

      {/* Popover / Panel Grid Nomor Soal */}
      <AnimatePresence>
        {showNumberGrid && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-indigo-950/30 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-indigo-950 text-base">Lembar Nomor Soal</h3>
                  <p className="text-xs text-slate-400 font-medium">Klik nomor untuk langsung berpindah soal.</p>
                </div>
                <button 
                  onClick={() => setShowNumberGrid(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-xs flex items-center justify-center transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2.5 max-h-72 overflow-y-auto p-1">
                {displayQuestions.map((q: any, idx: number) => {
                  const ansVal = answers[q.id];
                  const isAnswered = ansVal !== undefined && ansVal !== '' && 
                    (Array.isArray(ansVal) ? ansVal.length > 0 : 
                    (typeof ansVal === 'object' ? Object.keys(ansVal).length > 0 : true));

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        setShowNumberGrid(false);
                      }}
                      className={cn(
                        "h-11 rounded-2xl font-black text-xs sm:text-sm transition-all flex flex-col items-center justify-center cursor-pointer",
                        currentQuestionIndex === idx 
                          ? "bg-indigo-950 text-white shadow-lg shadow-indigo-950/30 ring-2 ring-indigo-950 ring-offset-2" 
                          : isAnswered
                            ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-100" 
                            : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <span>{idx + 1}</span>
                      {isAnswered && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 text-xs text-slate-500 font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-indigo-950"></span> Soal Aktif
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300"></span> Terjawab
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200"></span> Belum
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        {/* Progress & Quick Stepper Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-950 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl">
              Soal {currentQuestionIndex + 1} dari {displayQuestions.length}
            </span>
            <span className="text-xs font-bold text-slate-400">
              ({Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length} selesai dijawab)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-28 sm:w-36 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-950 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(((currentQuestionIndex + 1) / (displayQuestions.length || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card Soal */}
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl sm:rounded-[2rem] shadow-xl shadow-indigo-950/5 border border-slate-100 p-6 sm:p-10"
        >
          {(() => {
            const currentQ = displayQuestions[currentQuestionIndex];
            if (!currentQ) return null;
            const qType = currentQ.question_type || currentQ.type || 'Pilihan Ganda';
            const currentAnswer = answers[currentQ.id];

            return (
              <>
                <div className="mb-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                      Pertanyaan {currentQuestionIndex + 1} Dari {displayQuestions.length}
                    </span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full",
                      qType === 'Pilihan Ganda' ? "bg-slate-100 text-slate-600" :
                      qType === 'Essay' ? "bg-amber-100 text-amber-800" :
                      qType.includes('TKA') ? "bg-purple-100 text-purple-800" :
                      "bg-indigo-100 text-indigo-800"
                    )}>
                      {qType}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-indigo-950 mt-6 leading-relaxed">
                    {currentQ.question_text}
                  </h2>

                  {currentQ.image_url && (
                    <div className="mt-6 rounded-3xl overflow-hidden border border-slate-100 bg-slate-50/50">
                      <img 
                        src={currentQ.image_url} 
                        alt="Question Attachment" 
                        className="w-full max-h-[500px] object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>

                {/* 1. Pilihan Ganda Tunggal & TKA Klasik */}
                {(qType === 'Pilihan Ganda' || qType === 'Pilihan Ganda Asosiatif (TKA)' || qType === 'Hubungan Sebab Akibat (TKA)') && (
                  <div className="space-y-4">
                    {(currentQ.options || []).map((opt: any) => (
                      <label 
                        key={opt.id}
                        className={cn(
                          "flex items-center gap-4 p-5 sm:p-6 rounded-3xl border-2 cursor-pointer transition-all active:scale-[0.98]",
                          currentAnswer === opt.id
                            ? "border-indigo-950 bg-indigo-50/50 shadow-md shadow-indigo-950/5"
                            : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                      >
                        <input 
                          type="radio" 
                          className="hidden" 
                          name={`q-${currentQuestionIndex}`}
                          checked={currentAnswer === opt.id}
                          onChange={() => handleAnswer(currentQ.id, opt.id)}
                        />
                        <div className={cn(
                          "w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-all",
                          currentAnswer === opt.id
                            ? "bg-indigo-950 text-white"
                            : "bg-slate-100 text-slate-500"
                        )}>{opt.label || opt.id.toUpperCase()}</div>
                        <span className="font-bold text-indigo-950 text-sm sm:text-base">{opt.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* 2. Pilihan Ganda Kompleks (Multi-Select) */}
                {qType === 'Pilihan Ganda Kompleks' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center gap-2 mb-2">
                      <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-xs font-bold text-indigo-950">Pilih semua jawaban yang benar (dapat mencentang lebih dari satu).</span>
                    </div>
                    {(currentQ.options || []).map((opt: any) => {
                      const selectedKeys = (Array.isArray(currentAnswer) ? currentAnswer : String(currentAnswer || '').split(',')).map((s: string) => String(s).trim().toLowerCase()).filter(Boolean);
                      const isSelected = selectedKeys.includes(opt.id.toLowerCase());
                      return (
                        <label 
                          key={opt.id}
                          onClick={() => {
                            let nextKeys: string[];
                            if (isSelected) {
                              nextKeys = selectedKeys.filter((k: string) => k !== opt.id.toLowerCase());
                            } else {
                              nextKeys = [...selectedKeys, opt.id.toLowerCase()].sort();
                            }
                            handleAnswer(currentQ.id, nextKeys.join(','));
                          }}
                          className={cn(
                            "flex items-center gap-4 p-5 sm:p-6 rounded-3xl border-2 cursor-pointer transition-all active:scale-[0.98]",
                            isSelected
                              ? "border-indigo-950 bg-indigo-50/50 shadow-md shadow-indigo-950/5"
                              : "border-slate-100 bg-white hover:border-slate-200"
                          )}
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-all",
                            isSelected
                              ? "bg-indigo-950 text-white"
                              : "border-2 border-slate-200 text-slate-400 bg-slate-50"
                          )}>
                            {isSelected ? '✓' : (opt.label || opt.id.toUpperCase())}
                          </div>
                          <span className="font-bold text-indigo-950 text-sm sm:text-base">{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 3. Menjodohkan (Matching Pairs) */}
                {qType === 'Menjodohkan' && (() => {
                  const rawPairs = (currentQ.options || []).map((opt: any, pIdx: number) => {
                    const parts = String(opt.text || '').split('=');
                    return {
                      id: opt.id || String(pIdx),
                      left: parts[0]?.trim() || '',
                      right: parts.slice(1).join('=').trim() || ''
                    };
                  }).filter((p: any) => p.left && p.right);

                  // Extract distinct right answers for selector
                  const availableRightOptions = Array.from(new Set(rawPairs.map((p: any) => p.right)));
                  let currentMatches: Record<string, string> = {};
                  if (typeof currentAnswer === 'object') {
                    currentMatches = currentAnswer || {};
                  } else {
                    try { currentMatches = JSON.parse(currentAnswer || '{}'); } catch {}
                  }

                  return (
                    <div className="space-y-4">
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-emerald-950">Pasangkan pernyataan di kolom kiri dengan pilihan di kolom kanan.</span>
                      </div>
                      <div className="space-y-3">
                        {rawPairs.map((p: any, pIdx: number) => {
                          const selectedPair = currentMatches[p.id] || currentMatches[p.left] || '';
                          return (
                            <div key={p.id || pIdx} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl border-2 border-slate-100 bg-white hover:border-slate-200 transition-all">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-950 font-black text-xs flex items-center justify-center shrink-0">
                                  {pIdx + 1}
                                </span>
                                <span className="font-bold text-indigo-950 text-sm sm:text-base">{p.left}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <select
                                  value={selectedPair}
                                  onChange={(e) => {
                                    const nextMatches = { ...currentMatches, [p.id]: e.target.value };
                                    handleAnswer(currentQ.id, nextMatches);
                                  }}
                                  className={cn(
                                    "px-4 py-2.5 rounded-2xl border-2 font-bold text-xs sm:text-sm outline-none cursor-pointer transition-all w-full sm:w-auto",
                                    selectedPair
                                      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                      : "border-slate-200 bg-slate-50 text-slate-500"
                                  )}
                                >
                                  <option value="">-- Pilih Pasangan --</option>
                                  {availableRightOptions.map((optVal: string) => (
                                    <option key={optVal} value={optVal}>{optVal}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Isian Singkat */}
                {qType === 'Isian Singkat' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-2 mb-2">
                      <Type className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="text-xs font-bold text-amber-950">Ketikkan kata kunci / angka jawaban Anda pada kotak di bawah.</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="text"
                        autoFocus
                        placeholder="Ketik jawaban di sini..."
                        value={currentAnswer || ''}
                        onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                        className="w-full p-6 text-lg font-bold text-indigo-950 rounded-3xl border-2 border-slate-200 bg-slate-50 outline-none focus:border-indigo-950 focus:bg-white transition-all shadow-inner"
                      />
                    </div>
                  </div>
                )}

                {/* 5. Drag and Drop (Mengurutkan) */}
                {qType === 'Drag and Drop' && (() => {
                  const initialItems = (currentQ.options || []).map((opt: any, idx: number) => ({
                    id: opt.id || String(idx),
                    text: opt.text
                  }));

                  // If student already dragged, restore their order; otherwise keep initial
                  let currentOrderItems = initialItems;
                  if (Array.isArray(currentAnswer) && currentAnswer.length === initialItems.length) {
                    currentOrderItems = currentAnswer.map((savedId: string) => 
                      initialItems.find((it: any) => it.id === savedId)
                    ).filter(Boolean);
                    if (currentOrderItems.length !== initialItems.length) {
                      currentOrderItems = initialItems;
                    }
                  }

                  return (
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-2 mb-2">
                        <Layers className="w-4 h-4 text-blue-700 shrink-0" />
                        <span className="text-xs font-bold text-blue-950">Geser (Drag & Drop) kartu di bawah ini untuk menyusun urutan yang benar.</span>
                      </div>
                      <Reorder.Group
                        axis="y"
                        values={currentOrderItems}
                        onReorder={(newOrder) => {
                          const orderIds = newOrder.map((it: any) => it.id);
                          handleAnswer(currentQ.id, orderIds);
                        }}
                        className="space-y-3"
                      >
                        {currentOrderItems.map((item: any, orderIdx: number) => (
                          <Reorder.Item
                            key={item.id}
                            value={item}
                            className="flex items-center gap-4 p-5 rounded-3xl border-2 border-slate-200 bg-white shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all select-none"
                          >
                            <div className="bg-slate-100 text-slate-400 p-2 rounded-xl">
                              <GripVertical className="w-5 h-5" />
                            </div>
                            <span className="w-7 h-7 rounded-xl bg-indigo-950 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {orderIdx + 1}
                            </span>
                            <span className="font-bold text-indigo-950 text-sm sm:text-base flex-1">{item.text}</span>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    </div>
                  );
                })()}

                {/* 6. Essay */}
                {qType === 'Essay' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-2 mb-2">
                      <Type className="w-4 h-4 text-slate-700 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Tuliskan penjelasan atau uraian jawaban secara lengkap.</span>
                    </div>
                    <textarea 
                      rows={6}
                      placeholder="Ketik uraian jawaban Anda di sini..."
                      value={currentAnswer || ''}
                      onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                      className="w-full p-6 text-sm font-medium text-indigo-950 rounded-3xl border-2 border-slate-200 bg-slate-50 outline-none focus:border-indigo-950 focus:bg-white transition-all min-h-[160px]"
                    />
                  </div>
                )}
              </>
            );
          })()}
        </motion.div>

        {/* Bottom Actions Bar */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <button 
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            className="px-5 sm:px-6 py-3 rounded-2xl font-black text-xs sm:text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Soal Sebelumnya
          </button>

          <button
            type="button"
            onClick={() => setShowNumberGrid(true)}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-950" />
            <span>Semua Soal ({currentQuestionIndex + 1}/{displayQuestions.length})</span>
          </button>
          
          {currentQuestionIndex === displayQuestions.length - 1 ? (
            <button 
              onClick={submitExam}
              disabled={submitting}
              className="px-6 sm:px-8 py-3 rounded-2xl font-black text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Kumpulkan Jawaban</span>
            </button>
          ) : (
            <button 
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="px-5 sm:px-7 py-3 rounded-2xl font-black text-xs sm:text-sm text-white bg-indigo-950 hover:bg-indigo-900 shadow-lg shadow-indigo-950/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <span>Soal Berikutnya</span> <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
