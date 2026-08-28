import gurusData from '../../public/seed_gurus.json';
import muridsData from '../../public/seed_murids.json';

export interface TeacherAccount {
  id: string;
  email: string;
  nama: string;
  nip: string;
  role: string;
  sekolah: string;
  mata_pelajaran: string;
  password_pin: string;
}

export interface StudentAccount {
  id: string;
  nama: string;
  nisn: string;
  email: string;
  nama_kelas: string;
  nomor_absen: string;
  password_pin: string;
  role: string;
}

export const GURUS_LIST: TeacherAccount[] = gurusData as TeacherAccount[];
export const MURIDS_LIST: StudentAccount[] = muridsData as StudentAccount[];

export const SUPER_ADMIN_ACCOUNT = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin19bdg@sch.id',
  nama: 'Super Administrator SMAN 19',
  nip: 'ADMIN-19',
  role: 'superadmin',
  sekolah: 'SMAN 19 Bandung',
  password_pin: 'sman19bdg*'
};

/**
 * Fast synchronous lookup for offline instant authentication
 */
export function findTeacher(identifier: string): TeacherAccount | undefined {
  const clean = identifier.trim().toLowerCase().replace(/[\s-]/g, '');
  return GURUS_LIST.find(g => {
    const cleanNip = (g.nip || '').toLowerCase().replace(/[\s-]/g, '');
    const cleanEmail = (g.email || '').toLowerCase();
    const prefix = cleanEmail.split('@')[0];
    return cleanNip === clean || cleanEmail === clean || prefix === clean;
  });
}

export function findStudent(identifier: string): StudentAccount | undefined {
  const clean = identifier.trim().toLowerCase().replace(/[\s-]/g, '');
  return MURIDS_LIST.find(s => {
    const cleanNis = (s.nisn || '').toLowerCase().replace(/[\s-]/g, '');
    const cleanEmail = (s.email || '').toLowerCase();
    const prefix = cleanEmail.split('@')[0];
    return cleanNis === clean || cleanEmail === clean || prefix === clean;
  });
}
