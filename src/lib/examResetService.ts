/**
 * Service to handle Exam Lockouts, Resets, and Resuming for Nineteen Exam
 * Allows teachers/admins to unlock blocked students and reset accidental submissions
 * while preserving all previously answered questions.
 */

import { getCollectionData, saveCollection } from './db';

export const MASTER_UNLOCK_PINS = ['19SMAN', 'RESET19', 'GURU19', 'SMAN19'];

export interface ExamResetRecord {
  examId: string;
  studentCode: string;
  studentName?: string;
  action: 'unlock' | 'resume' | 'reset_all';
  authorizedAt: string;
  authorizedBy?: string;
}

/**
 * Checks if a given PIN is a recognized emergency/master unlock code
 */
export function isMasterUnlockPin(pin: string): boolean {
  if (!pin) return false;
  const clean = pin.trim().toUpperCase();
  return MASTER_UNLOCK_PINS.includes(clean);
}

/**
 * Authorizes a student to resume their exam after accidentally submitting,
 * or clears their lockout status.
 */
export async function authorizeStudentExamResume(
  examId: string, 
  studentCode: string, 
  studentName?: string,
  authorizedBy?: string
): Promise<boolean> {
  const normExamId = String(examId).trim();
  const normCode = String(studentCode).trim().toUpperCase();

  try {
    // 1. Simpan ke koleksi lokal exam_resets
    const existingResets = (await getCollectionData('exam_resets')) || [];
    const filtered = existingResets.filter((r: any) => 
      !(String(r.examId).trim() === normExamId && String(r.studentCode).trim().toUpperCase() === normCode)
    );

    const newRecord: ExamResetRecord = {
      examId: normExamId,
      studentCode: normCode,
      studentName: studentName || 'Murid',
      action: 'resume',
      authorizedAt: new Date().toISOString(),
      authorizedBy: authorizedBy || 'Guru / Admin'
    };

    filtered.push(newRecord);
    await saveCollection('exam_resets', filtered);
    localStorage.setItem(`reset_auth_${normCode}_${normExamId}`, JSON.stringify(newRecord));

    // 2. Hapus hasil submission sebelumnya dari koleksi results lokal agar tidak tercatat ganda
    const existingResults = (await getCollectionData('results')) || [];
    const updatedResults = existingResults.filter((r: any) => {
      const rCode = String(r.student_code || r.student?.code || '').trim().toUpperCase();
      const rExam = String(r.driveFileId || r.examId || r.exam_title || '').trim();
      const isMatch = rCode === normCode && (rExam.includes(normExamId) || rExam === normExamId);
      return !isMatch;
    });
    await saveCollection('results', updatedResults);

    // 3. Hapus juga dari Appwrite Cloud jika terhubung
    try {
      const { databases, COLLECTIONS, APPWRITE_DATABASE_ID, Query } = await import('./appwrite');
      const res = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.EXAM_RESULTS,
        [Query.equal('student_code', normCode), Query.limit(10)]
      );
      if (res && res.documents) {
        for (const doc of res.documents) {
          await databases.deleteDocument(APPWRITE_DATABASE_ID, COLLECTIONS.EXAM_RESULTS, doc.$id);
        }
      }
    } catch (cloudErr) {
      console.warn('Appwrite clear previous result note:', cloudErr);
    }

    return true;
  } catch (err) {
    console.error('Failed to authorize student exam resume:', err);
    return false;
  }
}

/**
 * Checks whether the student has an active reset authorization from teacher
 */
export async function checkStudentExamResumeAuthorized(
  examId: string, 
  studentCode: string
): Promise<boolean> {
  const normExamId = String(examId).trim();
  const normCode = String(studentCode).trim().toUpperCase();

  // 1. Cek LocalStorage
  const localAuth = localStorage.getItem(`reset_auth_${normCode}_${normExamId}`);
  if (localAuth) {
    try {
      const parsed = JSON.parse(localAuth);
      if (parsed && parsed.action) return true;
    } catch {}
  }

  // 2. Cek IndexedDB
  try {
    const existingResets = (await getCollectionData('exam_resets')) || [];
    const found = existingResets.find((r: any) => 
      String(r.examId).trim() === normExamId && 
      String(r.studentCode).trim().toUpperCase() === normCode
    );
    if (found) return true;
  } catch {}

  return false;
}

/**
 * Clears the student's submission lock on their device so they can immediately continue answering,
 * while strictly PRESERVING all their previous answers.
 */
export function executeStudentLocalResume(examId: string, studentCode: string): void {
  const normExamId = String(examId).trim();
  const normCode = String(studentCode).trim();

  try {
    // 1. Hapus flag submission agar tidak lagi berstatus 'alreadyCompleted'
    localStorage.removeItem(`submitted_${normCode}_${normExamId}`);
    localStorage.removeItem(`submission_meta_${normCode}_${normExamId}`);
    localStorage.removeItem(`submission_meta_${normExamId}`);
    localStorage.removeItem('edu_last_submission_qr');
    localStorage.removeItem('edu_last_submission_meta');
    localStorage.removeItem('edu_cheat_flagged');

    // 2. Bersihkan tanda otorisasi
    localStorage.removeItem(`reset_auth_${normCode.toUpperCase()}_${normExamId}`);

    // CATATAN: Kunci jawaban (answers_${normCode}_${normExamId}) SENGAJA TIDAK DIHAPUS
    // agar semua jawaban murid yang sudah diisi tetap utuh saat masuk kembali!
  } catch (err) {
    console.warn('executeStudentLocalResume error:', err);
  }
}
