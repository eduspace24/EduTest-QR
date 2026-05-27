/**
 * Generates a simple, secure 32-bit hash signature using a salt to prevent tampering.
 */
export function generateSignature(data: string): string {
  let hash = 0;
  const salt = "edu_secure_salt_2026";
  const str = data + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Packs exam result fields into a single pipe-delimited string with a signature.
 */
export function packResult(fields: {
  nama: string;
  kelas: string;
  code: string;
  driveFileId: string;
  score: number;
  startTime: string;
  endTime: string;
  tabSwitches: number;
  answersString: string;
  serverUrl?: string;
  examTitle?: string;
}): string {
  const dataParts = [
    fields.nama.replace(/\|/g, ''),
    fields.kelas.replace(/\|/g, ''),
    fields.code.replace(/\|/g, ''),
    fields.driveFileId.replace(/\|/g, ''),
    fields.score.toString(),
    fields.startTime.replace(/\|/g, ''),
    fields.endTime.replace(/\|/g, ''),
    fields.tabSwitches.toString(),
    fields.answersString.replace(/\|/g, ''),
    (fields.serverUrl || '').replace(/\|/g, ''),
    (fields.examTitle || '').replace(/\|/g, '')
  ];
  
  const dataString = dataParts.join('|');
  const signature = generateSignature(dataString);
  return `${dataString}|${signature}`;
}

/**
 * Unpacks a signed result string, verifying the signature.
 * Returns null if the signature is invalid.
 */
export function unpackResult(packed: string): {
  nama: string;
  kelas: string;
  code: string;
  driveFileId: string;
  score: number;
  startTime: string;
  endTime: string;
  tabSwitches: number;
  answersString: string;
  serverUrl?: string;
  examTitle?: string;
} | null {
  const parts = packed.split('|');
  if (parts.length < 10) return null;
  
  const signature = parts[parts.length - 1];
  const dataParts = parts.slice(0, parts.length - 1);
  const dataString = dataParts.join('|');
  
  const expectedSignature = generateSignature(dataString);
  if (signature !== expectedSignature) {
    console.error("Signature verification failed! Expected:", expectedSignature, "Got:", signature);
    return null;
  }
  
  return {
    nama: dataParts[0],
    kelas: dataParts[1],
    code: dataParts[2],
    driveFileId: dataParts[3],
    score: parseInt(dataParts[4]) || 0,
    startTime: dataParts[5],
    endTime: dataParts[6],
    tabSwitches: parseInt(dataParts[7]) || 0,
    answersString: dataParts[8],
    serverUrl: dataParts[9] || undefined,
    examTitle: dataParts[10] || undefined
  };
}
