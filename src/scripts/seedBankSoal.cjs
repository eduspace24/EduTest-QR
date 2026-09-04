const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { Client, Databases, Permission, Role } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6a9a2281000770a85575';
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6a9a32130018d9b3e0a1';
const API_KEY = process.env.APPWRITE_API_KEY || 'standard_0337311c9e5de7c10b5839fefe5d50c66d82373ff6f22db4211332f0ec10f43e0015c0d14c5886e7bab940b6121fe9f1e42408429dbefd10f322459d74f22428743dd6e9554f5e0f0b8dad957245d187e50719a0a9dd6def0fe687debddb89ed4770116a2c4b31a8d977e49edbc3e71102815dc277d56b98c8d3cb1ac14d4cee';

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new Databases(client);

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log('🔄 Menghapus koleksi bank_soal lama...');
  try {
    await databases.deleteCollection(DATABASE_ID, 'bank_soal');
    console.log('✅ Koleksi lama berhasil dihapus.');
    await delay(3000);
  } catch (err) {
    console.warn('Note delete:', err.message);
  }

  console.log('📦 Membuat koleksi bank_soal baru...');
  await databases.createCollection(
    DATABASE_ID,
    'bank_soal',
    'bank_soal',
    [
      Permission.read(Role.any()),
      Permission.create(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any())
    ]
  );
  console.log('✅ Koleksi bank_soal baru siap!');

  // Define attributes
  const attrs = [
    { key: 'text', size: 1500, req: true },
    { key: 'type', size: 50, req: false, def: 'Pilihan Ganda' },
    { key: 'category', size: 50, req: false, def: 'Informatika' },
    { key: 'option_a', size: 400, req: false },
    { key: 'option_b', size: 400, req: false },
    { key: 'option_c', size: 400, req: false },
    { key: 'option_d', size: 400, req: false },
    { key: 'option_e', size: 400, req: false },
    { key: 'jawaban_benar', size: 20, req: false, def: 'a' },
    { key: 'pembahasan', size: 1500, req: false },
    { key: 'image_url', size: 500, req: false }
  ];

  for (const a of attrs) {
    console.log(`➕ Menambahkan atribut ${a.key}...`);
    await databases.createStringAttribute(DATABASE_ID, 'bank_soal', a.key, a.size, a.req, a.def);
    await delay(400);
  }

  console.log('⏳ Menunggu 5 detik agar Appwrite menyelesaikan indexing atribut...');
  await delay(5000);

  // 2. Parse Docx File
  const filePath = path.join(__dirname, '../../Soal_ASAT_Informatika_Kelas_X_dengan_Kunci_Jawaban_dan_Pembahasan.docx');
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  const lines = result.value.split('\n').map(l => l.trim()).filter(Boolean);

  const headerIdx = lines.findIndex(l => l.includes('DAFTAR SOAL PILIHAN GANDA'));
  const questionLines = headerIdx !== -1 ? lines.slice(headerIdx + 1) : lines;

  const questions = [];
  let i = 0;
  while (i < questionLines.length) {
    const text = questionLines[i];
    if (!text || text.startsWith('Kunci Jawaban') || text.startsWith('Pembahasan')) {
      i++;
      continue;
    }

    if (i + 5 < questionLines.length) {
      const optA = questionLines[i + 1];
      const optB = questionLines[i + 2];
      const optC = questionLines[i + 3];
      const optD = questionLines[i + 4];
      const optE = questionLines[i + 5];

      let key = 'a';
      let pembahasan = '';
      let nextOffset = 6;

      if (i + nextOffset < questionLines.length && questionLines[i + nextOffset].startsWith('Kunci Jawaban:')) {
        const keyLine = questionLines[i + nextOffset];
        const match = keyLine.match(/Kunci Jawaban:\s*([A-Ea-e])/i);
        if (match) key = match[1].toLowerCase();
        nextOffset++;
      }

      if (i + nextOffset < questionLines.length && questionLines[i + nextOffset].startsWith('Pembahasan:')) {
        pembahasan = questionLines[i + nextOffset].replace(/^Pembahasan:\s*/i, '');
        nextOffset++;
      }

      questions.push({
        id: `soal_inf_${questions.length + 1}`,
        text: text.substring(0, 1490),
        type: 'Pilihan Ganda',
        category: 'Informatika',
        option_a: (optA || '').substring(0, 390),
        option_b: (optB || '').substring(0, 390),
        option_c: (optC || '').substring(0, 390),
        option_d: (optD || '').substring(0, 390),
        option_e: (optE || '').substring(0, 390),
        jawaban_benar: key,
        pembahasan: (pembahasan || '').substring(0, 1490),
        image_url: ''
      });

      i += nextOffset;
    } else {
      i++;
    }
  }

  console.log(`\n📚 Berhasil mengekstrak ${questions.length} soal Informatika!`);

  // 3. Save as public seed file
  const publicSeedPath = path.join(__dirname, '../../public/seed_bank_soal.json');
  fs.writeFileSync(publicSeedPath, JSON.stringify(questions, null, 2), 'utf8');
  console.log('💾 Berhasil menyimpan seed ke public/seed_bank_soal.json!');

  // 4. Upload each question to Appwrite database
  console.log(`\n☁️ Mengunggah ${questions.length} soal ke Appwrite collection 'bank_soal'...`);
  let uploaded = 0;
  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    const docId = `inf_x_${idx + 1}`;
    try {
      await databases.createDocument(
        DATABASE_ID,
        'bank_soal',
        docId,
        {
          text: q.text,
          type: q.type,
          category: q.category,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          option_e: q.option_e,
          jawaban_benar: q.jawaban_benar,
          pembahasan: q.pembahasan || '',
          image_url: ''
        }
      );
      uploaded++;
      process.stdout.write(`\rProgress upload: ${uploaded} / ${questions.length} soal terunggah...`);
    } catch (e) {
      console.warn(`\n⚠️ Catatan soal ${idx + 1}:`, e.message);
    }
  }

  console.log(`\n\n🎉 SELESAI! Seluruh ${uploaded} Soal Informatika berhasil masuk ke Database Appwrite & Bank Soal!`);
}

main().catch(console.error);
