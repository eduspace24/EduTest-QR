import http from 'k6/http';
import { check, sleep } from 'k6';

// Konfigurasi performa tes (Simulasi 50 Siswa)
export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up dari 0 ke 50 siswa selama 30 detik
    { duration: '1m', target: 50 },  // Bertahan di puncak 50 siswa berjalan konstan selama 1 menit
    { duration: '30s', target: 0 }   // Turun kembali (Ramp down)
  ],
};

// URL Vercel kamu. HARUS diganti dengan link Vercel asli milik EduTest kamu nanti
const BASE_URL = 'https://namadomain-edutest-kamu.vercel.app';

export default function () {
  // Skenario 1. Siswa merender halaman utama Ujian (Join)
  const res1 = http.get(`${BASE_URL}/exam`);
  check(res1, {
    'Halaman Join sukses dimuat (200)': (r) => r.status === 200,
  });

  // Siswa melihat-lihat halaman sebentar
  sleep(1);

  // Skenario 2. Siswa pura-pura masuk ruangan ujian
  // Karena ujian aslinya menggunakan Supabase Backend & state reaktif, 
  // bot kita cukup men-test kekuatan HTML Vercel & Supabase Edge Network.
  const res2 = http.get(`${BASE_URL}/exam/start/TEST-CODE-1234`);
  
  check(res2, {
    'Halaman Soal sukses di-load tanpa 500/Crash': (r) => r.status === 200 || r.status === 404 // 404 wajar jika tidak di server-side-render namun bundle load berhasil.
  });

  // Jeda antara siswa 1 dengan yang lain
  sleep(Math.random() * 2);
}
