import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getOrCreateRootFolder, readJsonFromDrive, setAccessToken, saveJsonToDrive } from '../lib/googleDrive';
import { saveCollection, isLocalNewer, getCollection, getCollectionData } from '../lib/db';

interface GoogleDriveContextType {
  isInitialized: boolean;
  isSyncing: boolean;
  rootFolderId: string | null;
  error: string | null;
  lastSyncTime: string | null;
  syncNow: () => Promise<void>;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | undefined>(undefined);

const SYNC_INTERVAL = 5 * 60 * 1000;

const COLLECTIONS = ['classes', 'students', 'bank_soal', 'exams_list', 'results', 'profile'];

export const GoogleDriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('edu_last_sync'));
  const syncTimerRef = useRef<number | null>(null);
  const initialSyncDone = useRef(false);

  const syncCollection = async (folderId: string, fileName: string, collectionName: string, forceFromDrive = false) => {
    try {
      const driveData = await readJsonFromDrive(folderId, fileName);
      if (!driveData) return null;

      const { data, modifiedTime } = driveData;
      
      if (forceFromDrive || !isLocalNewer(collectionName, modifiedTime)) {
        await saveCollection(collectionName, data, modifiedTime);
        console.log(`Synced ${collectionName} from Drive (newer)`);
        
        // Special handling for profile to ensure session is updated
        if (collectionName === 'profile') {
          localStorage.setItem('edu_profile', JSON.stringify(data));
        }
        
        return data;
      } else {
        console.log(`Using local ${collectionName} (local is newer)`);
        const localData = await getCollectionData(collectionName);
        
        if (collectionName === 'profile' && localData) {
          localStorage.setItem('edu_profile', JSON.stringify(localData));
        }
        
        return localData;
      }
    } catch (e) {
      console.warn(`Sync failed for ${collectionName}, using local:`, e);
      const localData = await getCollectionData(collectionName);
      return localData;
    }
  };

  const syncNow = async (showIndicator = false, targetCollection?: string) => {
    const sessionStr = localStorage.getItem('edu_session');
    const eduToken = localStorage.getItem('edu_token');
    if (!sessionStr) return;

    const session = JSON.parse(sessionStr);
    const token = eduToken || session.user?.token;
    if (session.user?.role !== 'guru' || !token) return;

    if (showIndicator) setIsSyncing(true);
    try {
      setAccessToken(token);
      const folderId = rootFolderId || await getOrCreateRootFolder();
      if (!rootFolderId) setRootFolderId(folderId);

      // Jika targetCollection ditentukan, hanya sinkronkan itu. Jika tidak, sinkronkan semuanya.
      const collectionsToSync = targetCollection ? [targetCollection] : COLLECTIONS;

      for (const coll of collectionsToSync) {
        const fileName = `${coll}.json`;
        // Force dari drive untuk results agar tidak terlewat data siswa baru
        const force = coll === 'results';
        await syncCollection(folderId, fileName, coll, force);
      }

      // Pastikan results.json ada di Drive
      if (!targetCollection || targetCollection === 'results') {
        const resultsFile = await readJsonFromDrive(folderId, 'results.json');
        if (!resultsFile) {
          console.log('Results file missing on Drive, creating empty results.json');
          await saveJsonToDrive(folderId, 'results.json', []);
        }
      }

      const now = new Date().toISOString();
      if (!targetCollection) {
        setLastSyncTime(now);
        localStorage.setItem('edu_last_sync', now);
      }
      setError(null);
    } catch (err: any) {
      console.error('Sync Error:', err);
      setError('Gagal sinkronisasi.');
    } finally {
      if (showIndicator) setIsSyncing(false);
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    const initSync = async () => {
      const sessionStr = localStorage.getItem('edu_session');
      if (!sessionStr) {
        setIsInitialized(true);
        return;
      }

      const session = JSON.parse(sessionStr);
      const token = localStorage.getItem('edu_token') || session.user?.token;
      
      if (session.user?.role === 'guru' && token) {
        setAccessToken(token);
        
        try {
          const folderId = await getOrCreateRootFolder();
          setRootFolderId(folderId);

          for (const coll of COLLECTIONS) {
            const fileName = `${coll}.json`;
            // Force from drive for results to ensure we don't skip student submissions
            const force = coll === 'results';
            await syncCollection(folderId, fileName, coll, force);
          }

          const now = new Date().toISOString();
          setLastSyncTime(now);
          localStorage.setItem('edu_last_sync', now);

          // Force create results.json if it's missing to ensure GAS has a target
          const resultsFile = await readJsonFromDrive(folderId, 'results.json');
          if (!resultsFile) {
            console.log('Results file missing on Drive, creating empty results.json');
            await saveJsonToDrive(folderId, 'results.json', []);
          }
        } catch (err) {
          console.warn('Initial sync failed, using local data:', err);
        }
      }
      
      setIsInitialized(true);
      initialSyncDone.current = true;
    };

    initSync();
  }, []);

  useEffect(() => {
    if (!initialSyncDone.current) return;

    syncTimerRef.current = window.setInterval(() => {
      syncNow(false);
    }, SYNC_INTERVAL);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, []);

  return (
    <GoogleDriveContext.Provider value={{ isInitialized, isSyncing, rootFolderId, error, lastSyncTime, syncNow }}>
      {children}
    </GoogleDriveContext.Provider>
  );
};

export const useGoogleDrive = () => {
  const context = useContext(GoogleDriveContext);
  if (context === undefined) {
    throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
  }
  return context;
};
