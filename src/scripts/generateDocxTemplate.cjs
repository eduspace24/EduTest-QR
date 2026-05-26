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
                    text: "1. Pisahkan setiap soal dengan 1 baris kosong.",
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
                    text: "5. Khusus untuk tipe soal TKA (Pilihan Ganda Asosiatif / Hubungan Sebab Akibat), Anda tidak perlu menuliskan pilihan Opsi A sampai Opsi E karena akan otomatis diisi oleh sistem sesuai format baku SBMPTN/UTBK.",
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

                // Soal 1
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

                // Soal 2
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "2. Jika (1) x > 0, (2) y > 0, (3) x+y > 0, (4) x*y < 0. Manakah pernyataan yang benar jika diketahui hasil penjumlahan bernilai positif dan perkalian negatif?", bold: true })
                    ]
                }),
                new docx.Paragraph({ text: "Tipe: Pilihan Ganda Asosiatif (TKA)" }),
                new docx.Paragraph({ text: "Kategori: Matematika TKA" }),
                new docx.Paragraph({ text: "Jawaban: A" }),
                new docx.Paragraph({ text: "" }),

                // Soal 3
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "3. Logam natrium sangat reaktif terhadap air. SEBAB Logam natrium memiliki energi ionisasi yang sangat kecil.", bold: true })
                    ]
                }),
                new docx.Paragraph({ text: "Tipe: Hubungan Sebab Akibat (TKA)" }),
                new docx.Paragraph({ text: "Kategori: Kimia TKA" }),
                new docx.Paragraph({ text: "Jawaban: A" }),
                new docx.Paragraph({ text: "" }),

                // Soal 4
                new docx.Paragraph({
                    children: [
                        new docx.TextRun({ text: "4. Jelaskan perbedaan antara pembelahan mitosis dan meiosis!", bold: true })
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
