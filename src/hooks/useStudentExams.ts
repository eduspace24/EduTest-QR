import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCollectionData } from '../lib/db';
import { resolveExamType } from '../lib/utils';

export interface StudentExamItem {
  id: string;
  title: string;
  subject?: string;
  duration_minutes?: number;
  duration?: number;
  exam_type?: 'harian' | 'semester';
  session_name?: string;
  start_time?: string;
  end_time?: string;
  teacher_name?: string;
  teacher_id?: string;
  driveFileId?: string;
  targetClasses?: string[];
  targetClassNames?: string[];
  targetGrade?: string;
  allowedStudents?: any[];
  submission_mode?: 'direct' | 'qr';
  show_score?: boolean;
  status?: string;
  created_at?: string;
  unlock_code?: string;
  token?: string;
}

export interface StudentRoomSeat {
  roomId: string;
  roomName: string;
  seatNumber: number;
}

export function useStudentExams() {
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [activeExams, setActiveExams] = useState<StudentExamItem[]>([]);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [roomSeat, setRoomSeat] = useState<StudentRoomSeat | null>(null);
  const [recentSubmission, setRecentSubmission] = useState<any>(null);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const user = session?.user || {
        nama: 'Murid Nineteen',
        nisn: '242510311',
        kelas: 'XII',
        role: 'murid'
      };
      setSessionUser(user);

      let allExams: any[] = [];

      // 1. Appwrite (Online sync if available)
      try {
        const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../lib/appwrite');
        const res = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.EXAMS,
          [Query.equal('status', 'active'), Query.orderDesc('$createdAt'), Query.limit(100)]
        );

        if (res && res.documents && res.documents.length > 0) {
          allExams = res.documents.map(d => {
            let parsedCloud: any = {};
            if (typeof d.questions === 'string') {
              try {
                const p = JSON.parse(d.questions);
                if (p && typeof p === 'object' && !Array.isArray(p)) {
                  parsedCloud = p;
                }
              } catch {}
            }
            return {
              ...parsedCloud,
              ...d,
              id: d.$id,
              created_at: d.$createdAt,
              exam_type: parsedCloud.exam_type || d.exam_type,
              targetClasses: parsedCloud.targetClasses || d.targetClasses || [],
              targetClassNames: parsedCloud.targetClassNames || d.targetClassNames || [],
              allowedStudents: parsedCloud.allowedStudents || d.allowedStudents || [],
              session_name: parsedCloud.session_name || d.session_name || '',
              start_time: parsedCloud.start_time || d.start_time || '',
              end_time: parsedCloud.end_time || d.end_time || '',
              unlock_code: parsedCloud.unlock_code || d.unlock_code || '',
              token: parsedCloud.unlock_code || parsedCloud.token || d.unlock_code || d.token || ''
            };
          });
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

      // Merge Appwrite with local rich fields
      if (allExams.length > 0) {
        allExams = allExams.map((appwriteExam: any) => {
          const local = localMap.get(appwriteExam.id) || {};
          const resolvedType = resolveExamType(local, appwriteExam);
          return {
            ...local,
            ...appwriteExam,
            targetClasses: (local.targetClasses && local.targetClasses.length > 0) ? local.targetClasses : (appwriteExam.targetClasses || []),
            targetClassNames: (local.targetClassNames && local.targetClassNames.length > 0) ? local.targetClassNames : (appwriteExam.targetClassNames || []),
            allowedStudents: (local.allowedStudents && local.allowedStudents.length > 0) ? local.allowedStudents : (appwriteExam.allowedStudents || []),
            exam_type: resolvedType,
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
          allExams.push({
            ...localItem,
            exam_type: resolveExamType(localItem)
          });
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

        if (exam.targetGrade && exam.targetGrade !== 'ALL') {
          return Boolean(studentGrade && exam.targetGrade.toUpperCase() === studentGrade.toUpperCase());
        }

        return true;
      });

      setActiveExams(targeted);

      // 5. Completed keys check
      const doneSet = new Set<string>();
      const studentCodeVal = user.nisn || user.code || user.id || '';
      const studentNameVal = (user.nama || user.name || '').trim().toLowerCase();

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

      try {
        const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('../lib/appwrite');
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

      // 6. Check student room & seat assignment from distribution
      try {
        const rooms = (await getCollectionData('exam_rooms_distribution')) || [];
        for (const r of rooms) {
          if (r && Array.isArray(r.seats)) {
            const foundSeat = r.seats.find((st: any) => {
              const sObj = st.student;
              if (!sObj) return false;
              if (studentCodeVal && (sObj.nisn === studentCodeVal || sObj.id === studentCodeVal)) return true;
              if (studentNameVal && sObj.nama && sObj.nama.trim().toLowerCase() === studentNameVal) return true;
              return false;
            });
            if (foundSeat) {
              setRoomSeat({
                roomId: r.id,
                roomName: r.name,
                seatNumber: foundSeat.seat_number
              });
              break;
            }
          }
        }
      } catch {}

      // 7. Last submission meta (hanya jika milik murid yang sedang login)
      const lastMeta = localStorage.getItem('edu_last_submission_meta');
      if (lastMeta) {
        try {
          const parsedMeta = JSON.parse(lastMeta);
          const mCode = parsedMeta.studentCode || parsedMeta.code || parsedMeta.nisn;
          const mName = (parsedMeta.studentName || parsedMeta.nama || '').trim().toLowerCase();
          if (
            (studentCodeVal && mCode && mCode === studentCodeVal) ||
            (studentNameVal && mName && mName === studentNameVal)
          ) {
            setRecentSubmission(parsedMeta);
          } else {
            setRecentSubmission(null);
          }
        } catch {
          setRecentSubmission(null);
        }
      } else {
        setRecentSubmission(null);
      }
    } catch (err) {
      console.error('Error fetching student exams in hook:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const isExamCompleted = useCallback((exam: StudentExamItem) => {
    if (!exam) return false;
    const studentCodeVal = sessionUser?.nisn || sessionUser?.code || sessionUser?.id || '';
    const studentNameVal = (sessionUser?.nama || sessionUser?.name || '').trim().toLowerCase();

    // 1. Cek dari database resmi hasil pengerjaan murid ini
    if (
      completedKeys.has(exam.id) ||
      (exam.driveFileId ? completedKeys.has(exam.driveFileId) : false)
    ) {
      return true;
    }

    // 2. Cek submission cache yang terikat khusus ke NISN / kode murid ini
    if (studentCodeVal) {
      if (
        Boolean(localStorage.getItem(`submitted_${studentCodeVal}_${exam.id}`)) ||
        (exam.driveFileId && Boolean(localStorage.getItem(`submitted_${studentCodeVal}_${exam.driveFileId}`)))
      ) {
        return true;
      }
    }

    // 3. Cek metadata lokal: pastikan identitas murid di dalamnya benar-benar cocok
    const metaCandidates = [
      studentCodeVal ? localStorage.getItem(`submission_meta_${studentCodeVal}_${exam.id}`) : null,
      exam.driveFileId && studentCodeVal ? localStorage.getItem(`submission_meta_${studentCodeVal}_${exam.driveFileId}`) : null,
      localStorage.getItem(`submission_meta_${exam.id}`),
      exam.driveFileId ? localStorage.getItem(`submission_meta_${exam.driveFileId}`) : null
    ].filter(Boolean);

    for (const raw of metaCandidates) {
      try {
        const m = JSON.parse(raw!);
        const mCode = m.studentCode || m.code || m.nisn;
        const mName = (m.studentName || m.nama || '').trim().toLowerCase();
        if (
          (studentCodeVal && mCode && mCode === studentCodeVal) ||
          (studentNameVal && mName && mName === studentNameVal)
        ) {
          return true;
        }
      } catch {}
    }

    return false;
  }, [completedKeys, sessionUser]);

  const dailyExams = useMemo(() => {
    return activeExams.filter(e => resolveExamType(e) === 'harian');
  }, [activeExams]);

  const semesterExams = useMemo(() => {
    return activeExams.filter(e => resolveExamType(e) === 'semester');
  }, [activeExams]);

  return {
    loading,
    sessionUser,
    activeExams,
    dailyExams,
    semesterExams,
    roomSeat,
    completedKeys,
    isExamCompleted,
    refreshExams: fetchExams,
    recentSubmission
  };
}
