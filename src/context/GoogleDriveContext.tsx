import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getOrCreateRootFolder, readJsonFromDrive, setAccessToken, saveJsonToDrive } from '../lib/googleDrive';
import { saveCollection, isLocalNewer, getCollectionData } from '../lib/db';
import { ensureValidToken } from '../lib/tokenManager';

interface GoogleDriveContextType {
  isInitialized: boolean;
  isSyncing: boolean;
  rootFolderId: string | null;
  error: string | null;
  lastSyncTime: string | null;
  syncNow: (showIndicator?: boolean, targetCollection?: string) => Promise<void>;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | undefined>(undefined);

const SYNC_INTERVAL = 5 * 60 * 1000;

const COLLECTIONS = ['classes', 'students', 'bank_soal', 'exams_list', 'results', 'profile'];

export const GoogleDriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(() => {
    const session = localStorage.getItem('edu_session');
    const profile = localStorage.getItem('edu_profile');
    return !(session && !profile);
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [rootFolderId, setRootFolderId] = useState<string | null>(localStorage.getItem('edu_root_folder_id'));
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('edu_last_sync'));
  const syncTimerRef = useRef<number | null>(null);
  const initialSyncDone = useRef(false);

  const syncSingleCollection = async (folderId: string, fileName: string, collectionName: string, forceFromDrive = false) => {
    try {
      const driveData = await readJsonFromDrive(folderId, fileName);
      
      if (collectionName === 'results') {
        const localResults = await getCollectionData('results') || [];
        const driveResults = driveData?.data || [];
        
        const mergedResults = [...driveResults];
        let hasNewLocal = false;
        
        localResults.forEach((localRes: any) => {
          const isAlreadyInDrive = driveResults.some((driveRes: any) => 
            driveRes.student?.code === localRes.student?.code && 
            driveRes.examFileId === localRes.examFileId
          );
          if (!isAlreadyInDrive) {
            mergedResults.push(localRes);
            hasNewLocal = true;
          }
        });

        const modifiedTime = driveData?.modifiedTime || new Date().toISOString();
        await saveCollection('results', mergedResults, modifiedTime);
        
        if (hasNewLocal || !driveData) {
          await saveJsonToDrive(folderId, 'results.json', mergedResults);
        }
        
        return mergedResults;
      }

      if (!driveData) {
        const localData = await getCollectionData(collectionName);
        if (localData && (Array.isArray(localData) ? localData.length > 0 : Object.keys(localData).length > 0)) {
          try {
            await saveJsonToDrive(folderId, fileName, localData);
          } catch (e) {
            console.warn(`Failed to upload local ${collectionName} for missing file:`, e);
          }
        }
        return localData;
      }

      const { data, modifiedTime } = driveData;
      
      if (forceFromDrive || !isLocalNewer(collectionName, modifiedTime)) {
        await saveCollection(collectionName, data, modifiedTime);
        
        if (collectionName === 'profile') {
          localStorage.setItem('edu_profile', JSON.stringify(data));
        }
        
        return data;
      } else {
        const localData = await getCollectionData(collectionName);
        
        try {
          await saveJsonToDrive(folderId, fileName, localData);
        } catch (uploadErr) {
          console.warn(`Failed to upload newer local ${collectionName} to Drive:`, uploadErr);
        }

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

  const ensureResultsFile = async (folderId: string) => {
    const resultsFile = await readJsonFromDrive(folderId, 'results.json');
    if (!resultsFile) {
      await saveJsonToDrive(folderId, 'results.json', []);
    }
  };

  const syncNow = async (showIndicator = false, targetCollection?: string) => {
    const sessionStr = localStorage.getItem('edu_session');
    if (!sessionStr) return;

    const session = JSON.parse(sessionStr);
    if (session.user?.role !== 'guru') return;

    const validToken = await ensureValidToken();
    if (!validToken) return;

    if (showIndicator) setIsSyncing(true);
    try {
      setAccessToken(validToken);
      const folderId = rootFolderId || await getOrCreateRootFolder();
      if (!rootFolderId) setRootFolderId(folderId);

      const collectionsToSync = targetCollection ? [targetCollection] : COLLECTIONS;

      if (targetCollection) {
        const fileName = `${targetCollection}.json`;
        const force = targetCollection === 'results';
        await syncSingleCollection(folderId, fileName, targetCollection, force);
      } else {
        await Promise.all(collectionsToSync.map(coll => {
          const fileName = `${coll}.json`;
          const force = coll === 'results';
          return syncSingleCollection(folderId, fileName, coll, force);
        }));
      }

      if (!targetCollection || targetCollection === 'results') {
        await ensureResultsFile(folderId);
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
        initialSyncDone.current = true;
        setIsInitialized(true);
        return;
      }

      const session = JSON.parse(sessionStr);
      
      if (session.user?.role === 'guru') {
        const validToken = await ensureValidToken();
        if (!validToken) {
          initialSyncDone.current = true;
          setIsInitialized(true);
          return;
        }
        
        setAccessToken(validToken);
        
        try {
          const folderId = rootFolderId || await getOrCreateRootFolder();
          if (!rootFolderId) setRootFolderId(folderId);

          await Promise.all(COLLECTIONS.map(coll => {
            const fileName = `${coll}.json`;
            const force = coll === 'results';
            return syncSingleCollection(folderId, fileName, coll, force);
          }));

          const now = new Date().toISOString();
          setLastSyncTime(now);
          localStorage.setItem('edu_last_sync', now);

          await ensureResultsFile(folderId);
        } catch (err) {
          console.warn('Initial sync failed, using local data:', err);
        }
      }
      
      initialSyncDone.current = true;
      setIsInitialized(true);
    };

    if (!initialSyncDone.current) {
      initSync();
    }
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
