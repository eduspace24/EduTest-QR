const docx = require("docx");
const fs = require("fs");

const doc = new docx.Document({
    sections: [
        {
            properties: {},
            children: [
                new docx.Paragraph({
                    text: "Template Bank Soal EduTest",
                    heading: docx.HeadingLevel.HEADING_1,
                }),
                new docx.Paragraph({
                    text: "Petunjuk: Isi tabel di bawah ini untuk mengimpor soal ke Bank Soal EduTest.",
                }),
                new docx.Paragraph({
                    text: "Untuk tipe soal TKA, Anda dapat mengosongkan kolom Opsi A sampai Opsi E agar diisi otomatis oleh sistem sesuai standar UTBK.",
                }),
                new docx.Paragraph({ text: "" }), // spacing
                new docx.Table({
                    rows: [
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph("Pertanyaan")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Tipe")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Kategori")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Opsi A")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Opsi B")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Opsi C")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Opsi D")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Opsi E")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Jawaban Benar")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Link Gambar")] }),
                            ],
                        }),
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph("Manakah dari bangun berikut yang memiliki 4 sisi sama panjang?")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Pilihan Ganda")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Matematika")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Persegi")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Persegi Panjang")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Segitiga")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Lingkaran")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Trapesium")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("a")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                            ],
                        }),
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph("Jika (1) x > 0, (2) y > 0, (3) x+y > 0, (4) x*y < 0. Manakah pernyataan yang benar jika diketahui hasil penjumlahan bernilai positif dan perkalian negatif?")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Pilihan Ganda Asosiatif (TKA)")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Matematika TKA")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("a")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                            ],
                        }),
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph("Logam natrium sangat reaktif terhadap air. SEBAB Logam natrium memiliki energi ionisasi yang sangat kecil.")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Hubungan Sebab Akibat (TKA)")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Kimia TKA")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("a")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                            ],
                        }),
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph("Jelaskan perbedaan antara pembelahan mitosis dan meiosis!")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Essay")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("Biologi")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                                new docx.TableCell({ children: [new docx.Paragraph("")] }),
                            ],
                        }),
                    ],
                }),
            ],
        },
    ],
});

docx.Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("public/Template_Bank_Soal_EduTest.docx", buffer);
    console.log("Template generated successfully!");
});
