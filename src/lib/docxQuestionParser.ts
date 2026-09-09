// @ts-ignore
import mammoth from 'mammoth';
import { uploadOrCompressDataUrl } from './cloudinary';

export interface ParsedBankQuestion {
  id: string;
  text: string;
  type: string;
  category: string;
  jenjang: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  option_a_image?: string;
  option_b_image?: string;
  option_c_image?: string;
  option_d_image?: string;
  option_e_image?: string;
  jawaban_benar: string;
  pembahasan?: string;
  image_url?: string;
}

export interface DocxParseStats {
  totalQuestions: number;
  totalImages: number;
  originalBytes: number;
  compressedBytes: number;
  savingsPercent: number;
}

export interface DocxParserOptions {
  teacherSubjects?: string[];
  activeFolder?: string | null;
  autoDetectCategory?: boolean;
  foldersList?: string[];
  customFolders?: string[];
  selectedSubjectFilter?: string;
  selectedJenjangFilter?: string;
  isSuperAdmin?: boolean;
  fileName?: string;
  onProgress?: (status: { stage: string; current: number; total: number }) => void;
}

interface BlockItem {
  text: string;
  images: string[];
}

/**
 * Traverses DOM tree to extract sequential blocks (paragraphs, headers, list items, table cells)
 * while capturing any embedded images (data URLs).
 */
function extractBlocksFromHtml(html: string): BlockItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: BlockItem[] = [];

  function walk(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Leaf block elements or table cells
      if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th'].includes(tag)) {
        const text = (el.textContent || '').trim();
        const imgs = Array.from(el.querySelectorAll('img'))
          .map(img => img.getAttribute('src') || '')
          .filter(src => src.startsWith('data:image/') || src.startsWith('http'));

        if (text || imgs.length > 0) {
          blocks.push({ text, images: imgs });
        }
        return; // Do not recurse into inner children of p/li/td
      }

      // Recurse down container nodes (body, div, table, tr, ul, ol, etc.)
      for (const child of Array.from(el.childNodes)) {
        walk(child);
      }
    }
  }

  walk(doc.body);
  return blocks;
}

/**
 * Intelligent DOCX Question & Image Parser
 * Extracts questions, options, and images from Word files and compresses images on the fly.
 */
export async function parseDocxQuestions(
  arrayBuffer: ArrayBuffer,
  options: DocxParserOptions = {}
): Promise<{ questions: ParsedBankQuestion[]; stats: DocxParseStats }> {
  const {
    teacherSubjects = [],
    activeFolder = null,
    autoDetectCategory = true,
    foldersList = [],
    customFolders = [],
    selectedSubjectFilter = 'ALL',
    selectedJenjangFilter = 'ALL',
    isSuperAdmin = false,
    fileName = '',
    onProgress
  } = options;

  onProgress?.({ stage: 'Mengekstrak dokumen Word...', current: 0, total: 100 });

  // 1. Convert Word docx to HTML with Base64 image preservation
  const mammothOptions = {
    convertImage: mammoth.images.imgElement((image: any) => {
      return image.read('base64').then((imageBuffer: string) => {
        const contentType = image.contentType || 'image/png';
        return {
          src: `data:${contentType};base64,${imageBuffer}`
        };
      });
    })
  };

  const mammothResult = await mammoth.convertToHtml({ arrayBuffer }, mammothOptions);
  const html = mammothResult.value;

  if (!html || !html.trim()) {
    throw new Error('Dokumen Word kosong atau tidak dapat dibaca.');
  }

  onProgress?.({ stage: 'Menganalisis teks & struktur soal...', current: 20, total: 100 });

  // 2. Extract sequential blocks with text and images
  const blocks = extractBlocksFromHtml(html);

  const rawQuestions: any[] = [];
  let currentQ: any = null;
  let currentTarget: 'question' | 'option_a' | 'option_b' | 'option_c' | 'option_d' | 'option_e' = 'question';

  const saveCurrentQIfValid = () => {
    if (!currentQ) return;
    const hasText = !!currentQ.text;
    const hasType = !!currentQ.type;
    const hasOptions = !!(currentQ.option_a || currentQ.option_b || currentQ.option_a_image || currentQ.option_b_image);
    const hasJawaban = !!currentQ.jawaban_benar;

    if (hasText || hasType || hasOptions || hasJawaban) {
      rawQuestions.push(currentQ);
    }
  };

  for (const block of blocks) {
    const text = block.text;
    const images = block.images;

    // Check if line starts a new question:
    // e.g. "1. Soal...", "1) Soal...", "Soal 1: ...", "No. 1: ..."
    const questionMatch = text.match(/^(?:soal|pertanyaan|no\.?)?\s*(\d+)[\s.:)-]+\s*(.*)/i);
    if (questionMatch) {
      saveCurrentQIfValid();

      currentQ = {
        text: questionMatch[2]?.trim() || '',
        type: '',
        category: teacherSubjects[0] || 'Informatika',
        jenjang: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        option_e: '',
        option_a_image: '',
        option_b_image: '',
        option_c_image: '',
        option_d_image: '',
        option_e_image: '',
        jawaban_benar: '',
        pembahasan: '',
        image_url: images.length > 0 ? images[0] : ''
      };
      currentTarget = 'question';
      continue;
    }

    if (!currentQ) continue;

    // Check field prefixes
    const isTipe = text.match(/^(?:tipe|type)\s*:\s*(.*)/i);
    const isKategori = text.match(/^(?:kategori|category|mapel|mata\s*pelajaran)\s*:\s*(.*)/i);
    const isJenjang = text.match(/^(?:jenjang|kelas|grade)\s*:\s*(.*)/i);
    const isJawaban = text.match(/^(?:jawaban|kunci(?:\s*jawaban)?|answer)\s*:\s*(.*)/i);
    const isPembahasan = text.match(/^(?:pembahasan|penjelasan|explanation)\s*:\s*(.*)/i);
    const isGambar = text.match(/^(?:gambar|image|foto)\s*:\s*(.*)/i);
    const isOption = text.match(/^([a-e])[\s.:)-]+\s*(.*)/i) || text.match(/^\(([a-e])\)\s*(.*)/i);

    if (isTipe) {
      currentQ.type = isTipe[1].trim();
      currentTarget = 'question';
    } else if (isKategori) {
      currentQ.category = isKategori[1].trim();
      currentTarget = 'question';
    } else if (isJenjang) {
      currentQ.jenjang = isJenjang[1].trim();
      currentTarget = 'question';
    } else if (isJawaban) {
      currentQ.jawaban_benar = isJawaban[1].trim().toLowerCase();
      currentTarget = 'question';
    } else if (isPembahasan) {
      currentQ.pembahasan = isPembahasan[1].trim();
      currentTarget = 'question';
    } else if (isGambar) {
      if (images.length > 0) {
        currentQ.image_url = images[0];
      } else if (isGambar[1].trim().startsWith('http') || isGambar[1].trim().startsWith('data:')) {
        currentQ.image_url = isGambar[1].trim();
      }
      currentTarget = 'question';
    } else if (isOption) {
      const optLetter = isOption[1].toLowerCase() as 'a' | 'b' | 'c' | 'd' | 'e';
      const optKey = `option_${optLetter}`;
      const optImgKey = `option_${optLetter}_image`;

      currentQ[optKey] = isOption[2].trim();
      if (images.length > 0) {
        currentQ[optImgKey] = images[0];
      }
      currentTarget = optKey as any;
    } else {
      // Continuation block
      if (currentTarget === 'question') {
        if (text) {
          currentQ.text += (currentQ.text ? '\n' : '') + text;
        }
        if (images.length > 0 && !currentQ.image_url) {
          currentQ.image_url = images[0];
        }
      } else if (currentTarget.startsWith('option_')) {
        const optImgKey = `${currentTarget}_image`;
        if (text) {
          currentQ[currentTarget] += (currentQ[currentTarget] ? ' ' : '') + text;
        }
        if (images.length > 0 && !currentQ[optImgKey]) {
          currentQ[optImgKey] = images[0];
        }
      }
    }
  }

  saveCurrentQIfValid();

  if (rawQuestions.length === 0) {
    throw new Error('Tidak ada data soal yang valid ditemukan di dalam dokumen Word.');
  }

  // 3. Count total images to process & perform smart client-side compression
  let totalImages = 0;
  for (const q of rawQuestions) {
    if (q.image_url) totalImages++;
    if (q.option_a_image) totalImages++;
    if (q.option_b_image) totalImages++;
    if (q.option_c_image) totalImages++;
    if (q.option_d_image) totalImages++;
    if (q.option_e_image) totalImages++;
  }

  let originalBytesTotal = 0;
  let compressedBytesTotal = 0;
  let processedImages = 0;

  onProgress?.({ stage: `Mengompresi ${totalImages} gambar secara otomatis...`, current: 30, total: 100 });

  for (let idx = 0; idx < rawQuestions.length; idx++) {
    const q = rawQuestions[idx];

    // Compress question image
    if (q.image_url && q.image_url.startsWith('data:image/')) {
      try {
        const comp = await uploadOrCompressDataUrl(q.image_url, `q_${idx}_image`, {
          maxWidth: 900,
          maxHeight: 900,
          isOption: false
        });
        q.image_url = comp.url;
        originalBytesTotal += comp.originalSize;
        compressedBytesTotal += comp.compressedSize;
      } catch (err) {
        console.warn('Error compressing question image:', err);
      }
      processedImages++;
      onProgress?.({
        stage: `Memproses gambar (${processedImages}/${totalImages})...`,
        current: Math.round(30 + (processedImages / Math.max(1, totalImages)) * 50),
        total: 100
      });
    }

    // Compress option images
    const optKeys: ('a' | 'b' | 'c' | 'd' | 'e')[] = ['a', 'b', 'c', 'd', 'e'];
    for (const optKey of optKeys) {
      const imgProp = `option_${optKey}_image`;
      const dataUrl = q[imgProp];
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        try {
          const comp = await uploadOrCompressDataUrl(dataUrl, `q_${idx}_opt_${optKey}`, {
            maxWidth: 500,
            maxHeight: 500,
            isOption: true
          });
          q[imgProp] = comp.url;
          originalBytesTotal += comp.originalSize;
          compressedBytesTotal += comp.compressedSize;
        } catch (err) {
          console.warn(`Error compressing option ${optKey} image:`, err);
        }
        processedImages++;
        onProgress?.({
          stage: `Memproses gambar (${processedImages}/${totalImages})...`,
          current: Math.round(30 + (processedImages / Math.max(1, totalImages)) * 50),
          total: 100
        });
      }
    }
  }

  onProgress?.({ stage: 'Menyelesaikan normalisasi data soal...', current: 85, total: 100 });

  // 4. Normalize fields, categories, types, and jenjang
  const finalizedQuestions: ParsedBankQuestion[] = rawQuestions.map((q, idx) => {
    let normalizedType = 'Pilihan Ganda';
    const typeLower = (q.type || '').toLowerCase();

    if (typeLower.includes('asosiatif')) {
      normalizedType = 'Pilihan Ganda Asosiatif (TKA)';
    } else if (typeLower.includes('sebab') || typeLower.includes('akibat')) {
      normalizedType = 'Hubungan Sebab Akibat (TKA)';
    } else if (typeLower.includes('kompleks') || typeLower.includes('multi')) {
      normalizedType = 'Pilihan Ganda Kompleks';
    } else if (typeLower.includes('jodoh') || typeLower.includes('match')) {
      normalizedType = 'Menjodohkan';
    } else if (typeLower.includes('isian') || typeLower.includes('rumpang') || typeLower.includes('singkat')) {
      normalizedType = 'Isian Singkat';
    } else if (typeLower.includes('drag') || typeLower.includes('urut')) {
      normalizedType = 'Drag and Drop';
    } else if (typeLower.includes('essay') || typeLower.includes('uraian')) {
      normalizedType = 'Essay';
    }

    let option_a = q.option_a;
    let option_b = q.option_b;
    let option_c = q.option_c;
    let option_d = q.option_d;
    let option_e = q.option_e;

    // Fill standardized options for TKA questions if blank
    if (normalizedType === 'Pilihan Ganda Asosiatif (TKA)' && (!option_a || option_a.trim() === '')) {
      option_a = '1, 2, dan 3 benar';
      option_b = '1 dan 3 benar';
      option_c = '2 dan 4 benar';
      option_d = 'Hanya 4 yang benar';
      option_e = 'Semua pernyataan benar';
    } else if (normalizedType === 'Hubungan Sebab Akibat (TKA)' && (!option_a || option_a.trim() === '')) {
      option_a = 'Pernyataan benar, alasan benar, dan keduanya menunjukkan hubungan sebab akibat';
      option_b = 'Pernyataan benar, alasan benar, tetapi keduanya tidak menunjukkan hubungan sebab akibat';
      option_c = 'Pernyataan benar dan alasan salah';
      option_d = 'Pernyataan salah dan alasan benar';
      option_e = 'Pernyataan dan alasan keduanya salah';
    }

    // Determine category based on activeFolder, autoDetectCategory & teacher subjects
    let finalCategory = '';
    if (activeFolder) {
      finalCategory = activeFolder;
    } else if (autoDetectCategory && q.category) {
      const rawCat = String(q.category || '').trim();
      const matchedInFolders = foldersList.find(f => f.toLowerCase() === rawCat.toLowerCase());
      finalCategory = matchedInFolders || rawCat;
    } else {
      finalCategory = teacherSubjects[0] || (isSuperAdmin ? 'Informatika' : 'Informatika');
    }

    if (!isSuperAdmin && teacherSubjects.length > 0 && !activeFolder) {
      const matchedSubject = teacherSubjects.find(ts => finalCategory.toLowerCase().includes(ts.toLowerCase()));
      const matchedCustom = customFolders.find(cf => cf.toLowerCase() === finalCategory.toLowerCase());
      finalCategory = matchedSubject || matchedCustom || (selectedSubjectFilter !== 'ALL' ? selectedSubjectFilter : teacherSubjects[0]);
    } else if (!finalCategory || finalCategory.toLowerCase() === 'umum') {
      finalCategory = selectedSubjectFilter !== 'ALL' ? selectedSubjectFilter : (teacherSubjects[0] || 'Informatika');
    }

    // Detect Jenjang (X, XI, XII) from file name or question content
    let detectedJenjang = selectedJenjangFilter !== 'ALL' ? selectedJenjangFilter : 'X';
    const fileLower = (fileName || '').toLowerCase();
    const qTextLower = (q.text || '').toLowerCase();
    const qJenjangLower = (q.jenjang || '').toLowerCase();

    if (qJenjangLower.includes('xii') || qJenjangLower.includes('12')) {
      detectedJenjang = 'XII';
    } else if (qJenjangLower.includes('xi') || qJenjangLower.includes('11')) {
      detectedJenjang = 'XI';
    } else if (qJenjangLower.includes('x') || qJenjangLower.includes('10')) {
      detectedJenjang = 'X';
    } else if (fileLower.includes('kelas_xii') || fileLower.includes('kelas xii') || fileLower.includes('kelas 12') || qTextLower.includes('kelas xii')) {
      detectedJenjang = 'XII';
    } else if (fileLower.includes('kelas_xi') || fileLower.includes('kelas xi') || fileLower.includes('kelas 11') || qTextLower.includes('kelas xi')) {
      detectedJenjang = 'XI';
    } else if (fileLower.includes('kelas_x') || fileLower.includes('kelas x') || fileLower.includes('kelas 10') || qTextLower.includes('kelas x')) {
      detectedJenjang = 'X';
    }

    const jawaban_benar = q.jawaban_benar || (normalizedType === 'Menjodohkan' ? 'auto' : 'a');

    return {
      id: `${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      text: q.text.trim(),
      type: normalizedType,
      category: finalCategory,
      jenjang: detectedJenjang,
      option_a: option_a || '',
      option_b: option_b || '',
      option_c: option_c || '',
      option_d: option_d || '',
      option_e: option_e || '',
      option_a_image: q.option_a_image || '',
      option_b_image: q.option_b_image || '',
      option_c_image: q.option_c_image || '',
      option_d_image: q.option_d_image || '',
      option_e_image: q.option_e_image || '',
      jawaban_benar,
      pembahasan: q.pembahasan || '',
      image_url: q.image_url || ''
    };
  });

  const savingsPercent = originalBytesTotal > 0
    ? Math.max(0, Math.round(((originalBytesTotal - compressedBytesTotal) / originalBytesTotal) * 100))
    : 0;

  onProgress?.({ stage: 'Selesai!', current: 100, total: 100 });

  return {
    questions: finalizedQuestions,
    stats: {
      totalQuestions: finalizedQuestions.length,
      totalImages,
      originalBytes: originalBytesTotal,
      compressedBytes: compressedBytesTotal,
      savingsPercent
    }
  };
}
