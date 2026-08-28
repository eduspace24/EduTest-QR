const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    let inQuotes = false;
    let currentField = '';
    const fields = [];
    
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());
    
    if (fields.length >= 4) {
      rows.push({
        id: fields[0],
        email: fields[1],
        nama: fields[2].replace(/^"|"$/g, ''),
        role: fields[3],
        nis: fields[4] || '',
        foto_url: fields[6] || ''
      });
    }
  }
  return rows;
}

const f1 = path.join(__dirname, '../../profiles_rows1.csv');
const f2 = path.join(__dirname, '../../profiles_rows2.csv');

const rows1 = parseCSV(f1);
const rows2 = parseCSV(f2);
const allRows = [...rows1, ...rows2];

// De-duplicate
const uniqueMap = new Map();
allRows.forEach(r => {
  if (r.email && !uniqueMap.has(r.email.toLowerCase())) {
    uniqueMap.set(r.email.toLowerCase(), r);
  }
});

const uniqueList = Array.from(uniqueMap.values());

const gurus = uniqueList.filter(r => r.role === 'guru').map(g => {
  const nip = g.email.split('@')[0];
  return {
    id: g.id || crypto.randomUUID(),
    email: g.email.toLowerCase(),
    nama: g.nama,
    nip: nip,
    role: 'guru',
    sekolah: 'SMAN 19 Bandung',
    mata_pelajaran: 'Guru Mata Pelajaran',
    password_pin: 'guru19*',
    is_active: true,
    foto_url: g.foto_url || ''
  };
});

const murids = uniqueList.filter(r => r.role === 'siswa').map(s => {
  const nis = s.nis || s.email.split('@')[0];
  // Determine estimated class from NIS prefix or standard
  const prefix = nis.substring(0, 4);
  let estimatedClass = 'X-1';
  if (prefix === '2425') estimatedClass = 'XII';
  else if (prefix === '2526') estimatedClass = 'XI';
  else if (prefix === '2627') estimatedClass = 'X';

  return {
    id: s.id || crypto.randomUUID(),
    nama: s.nama,
    nisn: nis,
    email: s.email.toLowerCase(),
    nama_kelas: estimatedClass,
    nomor_absen: nis.slice(-2) || '1',
    password_pin: 'murid19*',
    role: 'murid',
    foto_url: s.foto_url || ''
  };
});

// Super Admin
const superAdmin = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin19bdg@sch.id',
  nama: 'Super Administrator SMAN 19',
  nip: 'ADMIN-19',
  role: 'superadmin',
  sekolah: 'SMAN 19 Bandung',
  password_pin: 'sman19bdg*',
  is_active: true
};

// 1. Generate JSON cache files for instant fast local loading
fs.writeFileSync(
  path.join(__dirname, '../../public/seed_gurus.json'),
  JSON.stringify(gurus, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, '../../public/seed_murids.json'),
  JSON.stringify(murids, null, 2)
);

// 2. Generate SQL Statements
let sql = `-- ==========================================================\n`;
sql += `-- SEED DATA: NINETEEN EXAM (SMAN 19 BANDUNG)\n`;
sql += `-- ==========================================================\n\n`;

// Super Admin
sql += `-- 1. SUPER ADMIN\n`;
sql += `INSERT INTO public.profiles (id, email, nama, nip, role, sekolah, is_active) VALUES\n`;
sql += `  ('${superAdmin.id}', '${superAdmin.email}', '${superAdmin.nama}', '${superAdmin.nip}', 'superadmin', '${superAdmin.sekolah}', true)\n`;
sql += `ON CONFLICT (email) DO UPDATE SET role = 'superadmin', nama = EXCLUDED.nama;\n\n`;

// Gurus
sql += `-- 2. DATA GURU (${gurus.length} Akun, Password: guru19*)\n`;
sql += `INSERT INTO public.profiles (id, email, nama, nip, role, sekolah, mata_pelajaran, is_active) VALUES\n`;
const guruValues = gurus.map(g => 
  `  ('${g.id}', '${g.email}', '${g.nama.replace(/'/g, "''")}', '${g.nip}', 'guru', 'SMAN 19 Bandung', '${g.mata_pelajaran}', true)`
).join(',\n');
sql += guruValues + `\nON CONFLICT (email) DO UPDATE SET nama = EXCLUDED.nama, nip = EXCLUDED.nip, role = 'guru';\n\n`;

// Murids
sql += `-- 3. DATA MURID (${murids.length} Akun, Password: murid19*)\n`;
sql += `INSERT INTO public.students (id, nama, nisn, nama_kelas, nomor_absen, password_pin) VALUES\n`;
const muridValues = murids.map(m => 
  `  ('${m.id}', '${m.nama.replace(/'/g, "''")}', '${m.nisn}', '${m.nama_kelas}', '${m.nomor_absen}', 'murid19*')`
).join(',\n');
sql += muridValues + `\nON CONFLICT (nisn) DO UPDATE SET nama = EXCLUDED.nama, nama_kelas = EXCLUDED.nama_kelas, password_pin = 'murid19*';\n`;

fs.writeFileSync(path.join(__dirname, '../../public/seed_nineteen_exam.sql'), sql);

console.log('BERHASIL GENERATE DATA:');
console.log('- Super Admin: 1 akun (admin19bdg@sch.id / sman19bdg*)');
console.log('- Guru: ' + gurus.length + ' akun (Username: NIP/Email / Password: guru19*)');
console.log('- Murid: ' + murids.length + ' akun (Username: NIS/Email / Password: murid19*)');
console.log('- File SQL: public/seed_nineteen_exam.sql');
