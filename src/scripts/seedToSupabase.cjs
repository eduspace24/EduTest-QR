const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ahsbminpdqlvtfbtzobl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoc2JtaW5wZHFsdnRmYnR6b2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Njk5NjAsImV4cCI6MjEwMzQ0NTk2MH0.th5TGUV72iL0qawesgz9sEQlWFD8l8qZEzeC8J7raoE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runSeed() {
  console.log('🚀 Memulai proses pengunggahan akun ke Supabase:', SUPABASE_URL);

  // 1. Load Data
  const gurus = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/seed_gurus.json'), 'utf8'));
  const murids = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/seed_murids.json'), 'utf8'));

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

  const allProfiles = [superAdmin, ...gurus].map(p => ({
    id: p.id,
    email: p.email,
    nama: p.nama,
    nip: p.nip,
    role: p.role,
    sekolah: p.sekolah || 'SMAN 19 Bandung',
    mata_pelajaran: p.mata_pelajaran || 'Guru Mata Pelajaran',
    is_active: true
  }));

  // 2. Upload Profiles (Super Admin & Guru)
  console.log(`\n📥 Mengunggah ${allProfiles.length} akun ke tabel 'profiles'...`);
  try {
    const { data: profData, error: profErr } = await supabase
      .from('profiles')
      .upsert(allProfiles, { onConflict: 'email' });

    if (profErr) {
      console.error('⚠️ Catatan upload profiles:', profErr.message);
    } else {
      console.log('✅ Sukses mengunggah akun Super Admin & Guru ke tabel profiles!');
    }
  } catch (err) {
    console.error('Error profile insert:', err.message);
  }

  // 3. Upload Students in Batches of 50
  console.log(`\n📥 Mengunggah ${murids.length} akun murid ke tabel 'students'...`);
  const batchSize = 50;
  let successCount = 0;

  for (let i = 0; i < murids.length; i += batchSize) {
    const batch = murids.slice(i, i + batchSize).map(m => ({
      id: m.id,
      nama: m.nama,
      nisn: m.nisn,
      nama_kelas: m.nama_kelas,
      nomor_absen: m.nomor_absen,
      password_pin: m.password_pin
    }));

    try {
      const { error: studErr } = await supabase
        .from('students')
        .upsert(batch, { onConflict: 'nisn' });

      if (studErr) {
        console.error(`⚠️ Batch ${i}-${i + batch.length} notice:`, studErr.message);
      } else {
        successCount += batch.length;
        process.stdout.write(`\rProgress: ${successCount} / ${murids.length} murid terunggah...`);
      }
    } catch (err) {
      console.error(`Error batch ${i}:`, err.message);
    }
  }

  console.log('\n\n🎉 SELESAI!');
  console.log(`- 1 Super Admin & ${gurus.length} Guru terunggah ke Supabase.`);
  console.log(`- ${successCount} Murid terunggah ke Supabase.`);
}

runSeed();
