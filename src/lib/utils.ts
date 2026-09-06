import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateExamCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function generateStudentCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let result = 'EDU-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}j ${m}m`;
  return `${m} menit`;
}

function capitalizeSingleWord(w: string): string {
  if (!w) return '';
  const lower = w.toLowerCase();
  if (['dra.', 'drs.', 'hj.', 'h.', 'prof.', 'dr.'].includes(lower)) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  if (w.includes('-')) {
    return w.split('-').map(part => capitalizeSingleWord(part)).join('-');
  }
  if (w.includes("'")) {
    return w.split("'").map((part, i) => i === 0 ? capitalizeSingleWord(part) : part.toLowerCase()).join("'");
  }
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function capitalizeNameWords(str: string): string {
  return str
    .replace(/Hj\./gi, 'Hj. ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(capitalizeSingleWord)
    .join(' ');
}

/**
 * Format student name: Initial capital for each word, rest lowercase (Title Case).
 * e.g. "MUHAMMAD SULTHON YASIR" -> "Muhammad Sulthon Yasir"
 */
export function formatStudentName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return capitalizeNameWords(name);
}

/**
 * Format teacher name: Title Case for the main name, preserving academic titles (gelar) after the comma.
 * e.g. "MOH. ADLI ABDURRAHIM, S.Pd." -> "Moh. Adli Abdurrahim, S.Pd."
 * e.g. "Hj. NENI SURYANI, S.Pd." -> "Hj. Neni Suryani, S.Pd."
 */
export function formatTeacherName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  const commaIndex = trimmed.indexOf(',');
  if (commaIndex === -1) {
    return capitalizeNameWords(trimmed);
  }

  const namePart = trimmed.substring(0, commaIndex).trim();
  const titlesPart = trimmed.substring(commaIndex + 1).trim();
  const formattedName = capitalizeNameWords(namePart);

  const formattedTitles = titlesPart
    .split(',')
    .map(t => {
      let title = t.trim();
      if (title.toLowerCase() === 's.pd' || title.toLowerCase() === 's.pd.') return 'S.Pd.';
      if (title.toLowerCase() === 'm.pd' || title.toLowerCase() === 'm.pd.') return 'M.Pd.';
      if (title.toLowerCase() === 's.si' || title.toLowerCase() === 's.si.') return 'S.Si.';
      if (title.toLowerCase() === 's.e' || title.toLowerCase() === 's.e.') return 'S.E.';
      if (title.toLowerCase() === 's.s' || title.toLowerCase() === 's.s.') return 'S.S.';
      if (title.toLowerCase() === 's.th.i' || title.toLowerCase() === 's.th.i.') return 'S.Th.I.';
      if (title.toLowerCase() === 's.pd.i' || title.toLowerCase() === 's.pd.i.') return 'S.Pd.I.';
      if (title.toLowerCase() === 'm.m' || title.toLowerCase() === 'm.m.') return 'M.M.';
      if (title.toLowerCase() === 'm.si' || title.toLowerCase() === 'm.si.') return 'M.Si.';
      if (title.toLowerCase() === 'gr' || title.toLowerCase() === 'gr.') return 'Gr.';
      return title;
    })
    .join(', ');

  return `${formattedName}, ${formattedTitles}`;
}

/**
 * Universal name formatter based on role or presence of gelar
 */
export function formatPersonName(name: string, role?: string): string {
  if (!name || typeof name !== 'string') return '';
  if (role === 'guru' || role === 'teacher' || name.includes(',')) {
    return formatTeacherName(name);
  }
  return formatStudentName(name);
}

/**
 * Resolves whether an exam is 'harian' (ulangan harian) or 'semester' (ujian semester/serentak).
 * Checks explicit properties, intelligent title keywords, and configurations.
 */
export function resolveExamType(...candidates: any[]): 'harian' | 'semester' {
  // 1. Explicit exam_type in candidates
  for (const c of candidates) {
    if (!c) continue;
    const t = String(c.exam_type || '').trim().toLowerCase();
    if (t === 'harian' || t === 'daily' || t === 'formatif') return 'harian';
    if (t === 'semester' || t === 'sumatif' || t === 'serentak') return 'semester';
  }

  // 2. Intelligent title check
  for (const c of candidates) {
    if (!c || !c.title) continue;
    const title = String(c.title).toLowerCase();
    // Daily keywords: UH, PH, Formatif, Ulangan, Harian
    const isDaily = /\b(uh|ph|formatif|harian|ulangan)\b/i.test(title);
    // Semester keywords: ASAT, SAS, PAS, PTS, PAT, Sumatif, Semester, Serentak
    const isSemester = /\b(asat|sas|pas|pts|pat|sumatif|semester|serentak)\b/i.test(title);

    if (isDaily && !isSemester) return 'harian';
    if (isSemester && !isDaily) return 'semester';
  }

  // 3. Check session name or room assignment attributes
  for (const c of candidates) {
    if (!c) continue;
    if (c.session_name && String(c.session_name).trim() !== '' && String(c.session_name).trim() !== 'Sesi 1') {
      return 'semester';
    }
  }

  // 4. Fallback: if title contains "ulangan", it is harian
  for (const c of candidates) {
    if (!c || !c.title) continue;
    const title = String(c.title).toLowerCase();
    if (title.includes('ulangan')) return 'harian';
    if (title.includes('semester')) return 'semester';
  }

  // 5. Default to harian
  return 'harian';
}


