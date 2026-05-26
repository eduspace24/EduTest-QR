import { useEffect } from 'react';
import { getPendingSubmissions, removePendingSubmission } from '../lib/db';

/**
 * Background worker to retry failed exam submissions.
 * Runs every minute to ensure data reliability even in poor network conditions.
 */
export default function SyncWorker() {
  useEffect(() => {
    const processQueue = async () => {
      try {
        const pending = await getPendingSubmissions();
        if (pending.length === 0) return;

        console.log(`SyncWorker: Processing ${pending.length} pending submissions...`);

        for (const submission of pending) {
          const { id, serverUrl, ...payload } = submission;
          
          if (!serverUrl) {
            console.error(`SyncWorker: No server URL for submission ${id}`);
            continue;
          }

          try {
            // mode: 'no-cors' for GAS interaction
            const response = await fetch(serverUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify(payload)
            });

            // Since mode is 'no-cors', we can't check response.ok (it's always type: opaque)
            // But if fetch doesn't throw, it reached the server.
            console.log(`SyncWorker: Successfully delivered submission ${id}`);
            await removePendingSubmission(id);
          } catch (err) {
            console.warn(`SyncWorker: Failed to delivery submission ${id}, will retry later.`);
          }
        }
      } catch (err) {
        console.error('SyncWorker Error:', err);
      }
    };

    // Run once on mount
    processQueue();

    // Then run every 60 seconds
    const interval = setInterval(processQueue, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return null; // This is a background worker, no UI
}
