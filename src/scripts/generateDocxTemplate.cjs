const docx = require("docx");
const fs = require("fs");

const doc = new docx.Document({
    sections: [
        {
            properties: {},
            children: [
                new docx.Paragraph({
                    text: "TEMPLATE SOAL EDUTEST (WORD)",
                    heading: docx.HeadingLevel.HEADING_1,
                }),
                new docx.Paragraph({ text: "" }),
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({
                            text: "Petunjuk Pengisian Soal:",
                            bold: true,
                        })
                    ]
                }),
                new docx.Paragraph({
                    text: "1. Pisahkan setiap nomor soal dengan 1 baris kosong.",
                }),
                new docx.Paragraph({
                    text: "2. Tulis pertanyaan diawali dengan nomor (misalnya: 1. Pertanyaan... atau 1) Pertanyaan...).",
                }),
                new docx.Paragraph({
                    text: "3. Tulis field Tipe, Kategori, dan Jawaban menggunakan pemisah titik dua ':'.",
                }),
                new docx.Paragraph({
                    text: "4. Pilihan jawaban ditulis menggunakan huruf A s.d E diawali titik '.' atau titik dua ':' (Contoh A: Pilihan A).",
                }),
                new docx.Paragraph({
                    text: "5. Khusus untuk tipe soal TKA (Asosiatif & Sebab Akibat), opsi A s.d E akan otomatis diisi oleh sistem sesuai format baku.",
                }),
                new docx.Paragraph({
                    text: "6. Untuk Pilihan Ganda Kompleks, tuliskan kunci jawaban dipisah koma (Contoh: Jawaban: A, C, D).",
                }),
                new docx.Paragraph({
                    text: "7. Untuk Menjodohkan, tulis pasangan di tiap opsi dengan tanda '=' (Contoh: A: Jakarta = Indonesia).",
                }),
                new docx.Paragraph({
                    text: "8. Untuk Isian Singkat, tuliskan kunci jawaban di baris 'Jawaban:' (Contoh: Jawaban: Fotosintesis).",
                }),
                new docx.Paragraph({
                    text: "9. Untuk Drag and Drop (Mengurutkan), tuliskan urutan yang benar dari atas ke bawah (A, B, C, D) di opsi jawaban.",
                }),
                new docx.Paragraph({ text: "" }),

                new docx.Paragraph({
                    children: [
                        new docx.TextRun({
                            text: "CONTOH FORMAT SOAL DI BAWAH INI:",
                            bold: true,
                        })
                    ]
                }),
                new docx.Paragraph({ text: "" }),

                // Soal 1: Pilihan Ganda
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "1. Manakah dari bangun berikut yang memiliki 4 sisi sama panjang?", bold: true })
                    ]
                }),
                new docx.Paragraph({ text: "Tipe: Pilihan Ganda" }),
                new docx.Paragraph({ text: "Kategori: Matematika" }),
                new docx.Paragraph({ text: "A: Persegi" }),
                new docx.Paragraph({ text: "B: Persegi Panjang" }),
                new docx.Paragraph({ text: "C: Segitiga" }),
                new docx.Paragraph({ text: "D: Lingkaran" }),
                new docx.Paragraph({ text: "E: Trapesium" }),
                new docx.Paragraph({ text: "Jawaban: A" }),
                new docx.Paragraph({ text: "" }),

                // Soal 2: Pilihan Ganda Kompleks
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "2. Manakah dari pernyataan berikut yang merupakan ciri-ciri makhluk hidup? (Pilih lebih dari satu)", bold: true })
                    ]
                }),
                new docx.Paragraph({ text: "Tipe: Pilihan Ganda Kompleks" }),
                new docx.Paragraph({ text: "Kategori: Biologi" }),
                new docx.Paragraph({ text: "A: Bernapas" }),
                new docx.Paragraph({ text: "B: Tidak bergerak" }),
                new docx.Paragraph({ text: "C: Berkembang biak" }),
                new docx.Paragraph({ text: "D: Peka terhadap rangsang" }),
                new docx.Paragraph({ text: "E: Tidak memerlukan nutrisi" }),
                new docx.Paragraph({ text: "Jawaban: A, C, D" }),
                new docx.Paragraph({ text: "" }),

                // Soal 3: Menjodohkan
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "3. Jodohkan nama negara berikut dengan ibukotanya yang sesuai!", bold: true })
                    ]
                }),
                new docx.Paragraph({ text: "Tipe: Menjodohkan" }),
                new docx.Paragraph({ text: "Kategori: Geografi" }),
                new docx.Paragraph({ text: "A: Indonesia = Jakarta" }),
                new docx.Paragraph({ text: "B: Jepang = Tokyo" }),
                new docx.Paragraph({ text: "C: Prancis = Paris" }),
                new docx.Paragraph({ text: "D: Inggris = London" }),
                new docx.Paragraph({ text: "Jawaban: Auto" }),
                new docx.Paragraph({ text: "" }),

                // Soal 4: Isian Singkat
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "4. Proses pembuatan makanan pada tumbuhan hijau dengan bantuan cahaya matahari disebut...", bold: true })
                    ]
                }),
                new docx.Paragraph({ text: "Tipe: Isian Singkat" }),
                new docx.Paragraph({ text: "Kategori: Biologi" }),
                new docx.Paragraph({ text: "Jawaban: Fotosintesis" }),
                new docx.Paragraph({ text: "" }),

                // Soal 5: Drag and Drop (Mengurutkan)
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "5. Urutkan tahapan metamorfosis sempurna pada kupu-kupu dari awal hingga akhir!", bold: true })
                    ]
                }),
                new docx.Paragraph({ text: "Tipe: Drag and Drop" }),
                new docx.Paragraph({ text: "Kategori: Biologi" }),
                new docx.Paragraph({ text: "A: Telur" }),
                new docx.Paragraph({ text: "B: Ulat (Larva)" }),
                new docx.Paragraph({ text: "C: Kepompong (Pupa)" }),
                new docx.Paragraph({ text: "D: Kupu-kupu dewasa (Imago)" }),
                new docx.Paragraph({ text: "Jawaban: A, B, C, D" }),
                new docx.Paragraph({ text: "" }),

                // Soal 6: Pilihan Ganda Asosiatif (TKA)
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "6. Jika (1) x > 0, (2) y > 0, (3) x+y > 0, (4) x*y < 0. Manakah pernyataan yang benar jika diketahui hasil penjumlahan bernilai positif dan perkalian negatif?", bold: true })
                    ]
                }),
                new docx.Paragraph({ text: "Tipe: Pilihan Ganda Asosiatif (TKA)" }),
                new docx.Paragraph({ text: "Kategori: Matematika TKA" }),
                new docx.Paragraph({ text: "Jawaban: A" }),
                new docx.Paragraph({ text: "" }),

                // Soal 7: Hubungan Sebab Akibat (TKA)
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "7. Logam natrium sangat reaktif terhadap air. SEBAB Logam natrium memiliki energi ionisasi yang sangat kecil.", bold: true })
                    ]
                }),
                new docx.Paragraph({ text: "Tipe: Hubungan Sebab Akibat (TKA)" }),
                new docx.Paragraph({ text: "Kategori: Kimia TKA" }),
                new docx.Paragraph({ text: "Jawaban: A" }),
                new docx.Paragraph({ text: "" }),

                // Soal 8: Essay
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "8. Jelaskan perbedaan antara pembelahan mitosis dan meiosis secara mendalam!", bold: true })
                    ]
                }),
                new docx.Paragraph({ text: "Tipe: Essay" }),
                new docx.Paragraph({ text: "Kategori: Biologi" }),
            ],
        },
    ],
});

docx.Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("public/Template_Bank_Soal_EduTest.docx", buffer);
    console.log("Template generated successfully!");
});

