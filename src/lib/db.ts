/**
 * EduTest Local Database Service
 * Uses IndexedDB for persistent, optimized local storage.
 */

const DB_NAME = 'EduTestDB';
const DB_VERSION = 1;

export interface SyncMetadata {
  last_sync: string;
  updated_at: string;
}

export async function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('collections')) {
        db.createObjectStore('collections', { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains('pending_submissions')) {
        db.createObjectStore('pending_submissions', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCollection(name: string, data: any, updatedAt?: string, _schoolId?: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('collections', 'readwrite');
  const store = tx.objectStore('collections');
  
  const finalName = name; // Unified global storage
  
  const payload = {
    name: finalName,
    data,
    updated_at: updatedAt || new Date().toISOString()
  };
  
  return new Promise<void>((resolve, reject) => {
    const request = store.put(payload);
    request.onsuccess = () => {
      localStorage.setItem(`edu_${finalName}`, JSON.stringify(data));
      localStorage.setItem(`edu_${finalName}_updated`, payload.updated_at);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getCollection(name: string, _schoolId?: string): Promise<any> {
  const finalName = name; // Unified global storage
  try {
    const db = await openDB();
    const tx = db.transaction('collections', 'readonly');
    const store = tx.objectStore('collections');
    
    return new Promise<any>((resolve) => {
      const request = store.get(finalName);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          const fallback = localStorage.getItem(`edu_${finalName}`);
          resolve(fallback ? { data: JSON.parse(fallback) } : null);
        }
      };
      request.onerror = () => {
        const fallback = localStorage.getItem(`edu_${finalName}`);
        resolve(fallback ? { data: JSON.parse(fallback) } : null);
      };
    });
  } catch (e) {
    const fallback = localStorage.getItem(`edu_${finalName}`);
    return fallback ? { data: JSON.parse(fallback) } : null;
  }
}

export function isLocalNewer(collectionName: string, driveTimestamp: string, _schoolId?: string): boolean {
  const finalName = collectionName;
  const localTimestamp = localStorage.getItem(`edu_${finalName}_updated`);
  if (!localTimestamp) return false;
  if (!driveTimestamp) return true;
  
  return new Date(localTimestamp).getTime() > new Date(driveTimestamp).getTime();
}

export async function getCollectionData(name: string, schoolId?: string): Promise<any[]> {
  const result = await getCollection(name, schoolId);
  return result?.data || [];
}

// --- PENDING SUBMISSIONS HELPERS ---

export async function addToPendingSubmissions(payload: any): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('pending_submissions', 'readwrite');
  const store = tx.objectStore('pending_submissions');
  
  return new Promise<void>((resolve, reject) => {
    const request = store.add({
      ...payload,
      retryCount: 0,
      createdAt: new Date().toISOString()
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingSubmissions(): Promise<any[]> {
  const db = await openDB();
  const tx = db.transaction('pending_submissions', 'readonly');
  const store = tx.objectStore('pending_submissions');
  
  return new Promise<any[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingSubmission(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('pending_submissions', 'readwrite');
  const store = tx.objectStore('pending_submissions');
  
  return new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
