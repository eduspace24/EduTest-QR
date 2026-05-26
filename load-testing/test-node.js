// Gunakan fetch bawaan NodeJS (Node v18+)
const VERCEL_URL = "http://localhost:3000/exam";
const TOTAL_SISWA = 300;

async function serangVercel() {
  console.log(`🚀 Bersiap meluncurkan ${TOTAL_SISWA} Siswa Virtual ke ${VERCEL_URL}...`);
  console.log(`Tunggu sebentar ya..\n`);

  let sukses = 0;
  let gagal = 0;
  let startTime = Date.now();

  // Bikin 50 murid klik link secara bersamaan (Simulasi Barengan)
  const muridVirtual = Array.from({ length: TOTAL_SISWA }).map(async (_, index) => {
    try {
      const merespon = await fetch(VERCEL_URL);
      if (merespon.status === 200) {
        sukses++;
        console.log(`[Siswa ${index + 1}] ✅ Berhasil masuk web (Status 200)`);
      } else {
        gagal++;
        console.log(`[Siswa ${index + 1}] ❌ Web Error / Down (Status ${merespon.status})`);
      }
    } catch (err) {
      gagal++;
      console.log(`[Siswa ${index + 1}] 💥 Server Vercel Timed Out`);
    }
  });

  // Tunggu semua request selesai
  await Promise.all(muridVirtual);

  let endTime = Date.now();

  console.log(`\n==========================================`);
  console.log(`🏁 HASIL UJI COBA 50 SISWA SERENTAK 🏁`);
  console.log(`==========================================`);
  console.log(`Total Waktu Render     : ${(endTime - startTime) / 1000} detik`);
  console.log(`Siswa Sukses Masuk     : ${sukses} Anak`);
  console.log(`Siswa Gagal/Lagging    : ${gagal} Anak`);
  console.log(`Status Kekuatan Server : ${gagal === 0 ? 'MANTAP! AMAN 100% 🔥' : 'ADA YANG CRASH 🚧'}`);
}

serangVercel();
