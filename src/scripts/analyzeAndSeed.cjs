const fs = require('fs');
const path = require('path');

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

// De-duplicate by email or id
const uniqueMap = new Map();
allRows.forEach(r => {
  if (r.email && !uniqueMap.has(r.email)) {
    uniqueMap.set(r.email, r);
  }
});

const uniqueList = Array.from(uniqueMap.values());

const roleStats = {};
uniqueList.forEach(r => {
  roleStats[r.role] = (roleStats[r.role] || 0) + 1;
});

console.log('Total baris unik:', uniqueList.length);
console.log('Statistik Role:', roleStats);

const sampleGurus = uniqueList.filter(r => r.role === 'guru').slice(0, 5);
const sampleSiswas = uniqueList.filter(r => r.role === 'siswa').slice(0, 5);
const sampleAdmins = uniqueList.filter(r => r.role === 'admin' || r.role === 'superadmin');

console.log('\n--- CONTOH GURU (' + uniqueList.filter(r => r.role === 'guru').length + ' data) ---');
console.log(sampleGurus.map(g => ({
  nama: g.nama,
  email: g.email,
  nip: g.email.split('@')[0],
  role: 'guru'
})));

console.log('\n--- CONTOH SISWA/MURID (' + uniqueList.filter(r => r.role === 'siswa').length + ' data) ---');
console.log(sampleSiswas.map(s => ({
  nama: s.nama,
  nis: s.nis || s.email.split('@')[0],
  email: s.email,
  role: 'murid'
})));

console.log('\n--- ADMIN DITEMUKAN ---', sampleAdmins);
