const { Client, Databases, Permission, Role } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6a9a2281000770a85575';
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6a9a32130018d9b3e0a1';
const API_KEY = process.env.APPWRITE_API_KEY || '';

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

if (API_KEY) {
  client.setKey(API_KEY);
}

const databases = new Databases(client);

const COLLECTIONS = {
  profiles: {
    name: 'profiles',
    attributes: [
      { key: 'nama', type: 'string', size: 255, required: true },
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'nip', type: 'string', size: 100, required: false },
      { key: 'role', type: 'string', size: 50, required: true },
      { key: 'sekolah', type: 'string', size: 255, required: false },
      { key: 'mata_pelajaran', type: 'string', size: 255, required: false },
      { key: 'password_pin', type: 'string', size: 100, required: false },
      { key: 'is_active', type: 'boolean', required: false, default: true }
    ]
  },
  students: {
    name: 'students',
    attributes: [
      { key: 'nama', type: 'string', size: 255, required: true },
      { key: 'nisn', type: 'string', size: 50, required: true },
      { key: 'nama_kelas', type: 'string', size: 100, required: true },
      { key: 'nomor_absen', type: 'string', size: 20, required: false },
      { key: 'password_pin', type: 'string', size: 100, required: false }
    ]
  },
  classes: {
    name: 'classes',
    attributes: [
      { key: 'nama_kelas', type: 'string', size: 100, required: true },
      { key: 'tingkat', type: 'string', size: 50, required: false },
      { key: 'jurusan', type: 'string', size: 100, required: false }
    ]
  },
  exams: {
    name: 'exams',
    attributes: [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'subject', type: 'string', size: 100, required: false },
      { key: 'class_name', type: 'string', size: 100, required: false },
      { key: 'duration', type: 'integer', required: false },
      { key: 'status', type: 'string', size: 50, required: false, default: 'active' },
      { key: 'driveFileId', type: 'string', size: 255, required: false },
      { key: 'questions', type: 'string', size: 65535, required: false },
      { key: 'serverUrl', type: 'string', size: 255, required: false },
      { key: 'unlock_code', type: 'string', size: 50, required: false },
      { key: 'cheat_tolerance', type: 'integer', required: false }
    ]
  },
  exam_results: {
    name: 'exam_results',
    attributes: [
      { key: 'exam_title', type: 'string', size: 255, required: false },
      { key: 'student_name', type: 'string', size: 255, required: false },
      { key: 'student_class', type: 'string', size: 100, required: false },
      { key: 'student_code', type: 'string', size: 100, required: false },
      { key: 'score', type: 'integer', required: true },
      { key: 'answers_summary', type: 'string', size: 5000, required: false },
      { key: 'tab_switches', type: 'integer', required: false },
      { key: 'start_time', type: 'string', size: 50, required: false },
      { key: 'end_time', type: 'string', size: 50, required: false }
    ]
  }
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function setupSchema() {
  console.log('🚀 Memulai inisialisasi schema koleksi Appwrite...');

  // 1. Get existing collections
  const existing = await databases.listCollections(DATABASE_ID);
  const existingMap = new Map(existing.collections.map(c => [c.$id, c]));

  for (const [colId, config] of Object.entries(COLLECTIONS)) {
    let col = existingMap.get(colId);
    if (!col) {
      console.log(`\n📦 Membuat Koleksi: ${colId}...`);
      try {
        col = await databases.createCollection(
          DATABASE_ID,
          colId,
          config.name,
          [
            Permission.read(Role.any()),
            Permission.create(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any())
          ]
        );
        console.log(`✅ Koleksi ${colId} berhasil dibuat!`);
      } catch (err) {
        console.error(`❌ Gagal membuat koleksi ${colId}:`, err.message);
        continue;
      }
    } else {
      console.log(`ℹ️ Koleksi ${colId} sudah ada.`);
    }

    // Check & create attributes
    const attrList = await databases.listAttributes(DATABASE_ID, colId);
    const existingAttrKeys = new Set(attrList.attributes.map(a => a.key));

    for (const attr of config.attributes) {
      if (existingAttrKeys.has(attr.key)) continue;

      console.log(`  ➕ Menambahkan atribut ${attr.key} (${attr.type}) ke ${colId}...`);
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            colId,
            attr.key,
            attr.size,
            attr.required,
            attr.default
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            colId,
            attr.key,
            attr.required,
            undefined,
            undefined,
            attr.default
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            colId,
            attr.key,
            attr.required,
            attr.default
          );
        }
        await delay(500); // Appwrite index queue pause
      } catch (err) {
        console.warn(`    ⚠️ Gagal menambahkan atribut ${attr.key}:`, err.message);
      }
    }
  }

  console.log('\n⏳ Menunggu 5 detik agar Appwrite menyelesaikan indexing atribut...');
  await delay(5000);
}

async function seedData() {
  console.log('\n📥 Memulai seeding data Super Admin, Guru & Murid...');
  
  const gurus = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/seed_gurus.json'), 'utf8'));
  const murids = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/seed_murids.json'), 'utf8'));

  const superAdmin = {
    nama: 'Super Administrator SMAN 19',
    email: 'admin19bdg@sch.id',
    nip: 'ADMIN-19',
    role: 'superadmin',
    sekolah: 'SMAN 19 Bandung',
    mata_pelajaran: 'Administrator',
    password_pin: 'sman19bdg*',
    is_active: true
  };

  const allProfiles = [superAdmin, ...gurus].map(p => ({
    nama: p.nama,
    email: p.email,
    nip: p.nip || '',
    role: p.role || 'guru',
    sekolah: p.sekolah || 'SMAN 19 Bandung',
    mata_pelajaran: p.mata_pelajaran || 'Guru Mata Pelajaran',
    password_pin: p.password_pin || 'guru19*',
    is_active: true
  }));

  console.log(`📤 Mengunggah ${allProfiles.length} akun ke 'profiles'...`);
  for (const prof of allProfiles) {
    try {
      // ID up to 36 alphanumeric
      const docId = (prof.nip || prof.email).replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 36);
      await databases.createDocument(
        DATABASE_ID,
        'profiles',
        docId,
        prof,
        [
          Permission.read(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ]
      );
    } catch (err) {
      // Document might already exist
      if (!err.message.includes('already exists')) {
        console.warn(`    Catatan profile ${prof.email}:`, err.message);
      }
    }
  }
  console.log(`✅ Profiles berhasil diunggah!`);

  console.log(`\n📤 Mengunggah ${murids.length} akun murid ke 'students'...`);
  let count = 0;
  for (const m of murids) {
    try {
      const docId = String(m.nisn).replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 36);
      await databases.createDocument(
        DATABASE_ID,
        'students',
        docId,
        {
          nama: m.nama,
          nisn: String(m.nisn),
          nama_kelas: m.nama_kelas,
          nomor_absen: String(m.nomor_absen || ''),
          password_pin: String(m.password_pin || '123456')
        },
        [
          Permission.read(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ]
      );
      count++;
      if (count % 50 === 0) {
        process.stdout.write(`\rProgress: ${count} / ${murids.length} murid terunggah...`);
      }
    } catch (err) {
      if (!err.message.includes('already exists')) {
        // silent skip for existing
      }
    }
  }
  console.log(`\n✅ ${count} Murid selesai diproses ke Appwrite!`);
}

async function main() {
  try {
    await setupSchema();
    await seedData();
    console.log('\n🎉 Setup Appwrite Selesai Sukses!');
  } catch (err) {
    console.error('Fatal setup error:', err);
  }
}

main();
