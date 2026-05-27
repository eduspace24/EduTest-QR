/**
 * Google Drive API Service for EduTest
 * Handles folder creation, file saving, and exam retrieval.
 * Uses direct fetch to Google Drive API v3
 */

export const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
export const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

async function getValidTokenOrThrow(): Promise<string> {
  const { ensureValidToken, forceLogout } = await import('./tokenManager');
  const token = await ensureValidToken();
  if (token) return token;
  
  const sessionStr = localStorage.getItem('edu_session');
  const session = sessionStr ? JSON.parse(sessionStr) : null;
  const fallbackToken = session?.user?.token || localStorage.getItem('edu_token');
  if (fallbackToken) return fallbackToken;
  
  forceLogout('Sesi Anda telah berakhir. Silakan login ulang.');
  throw { status: 401, message: 'No access token' };
}

function getTokenFromSession(): string {
  const tokenFromStorage = localStorage.getItem('edu_token');
  if (tokenFromStorage) return tokenFromStorage;
  
  const sessionStr = localStorage.getItem('edu_session');
  if (!sessionStr) return '';
  const session = JSON.parse(sessionStr);
  return session?.user?.token || '';
}

async function fetchApi(endpoint: string, options: RequestInit = {}, retried = false) {
  const token = getTokenFromSession();
  
  if (!token) {
    console.error('DRIVE ERROR: No access token found in session');
    throw { status: 401, message: 'No access token' };
  }
  
  try {
    const response = await fetch(`${DRIVE_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401 && !retried) {
        const { ensureValidToken, forceLogout } = await import('./tokenManager');
        const newToken = await ensureValidToken();
        if (newToken) {
          return fetchApi(endpoint, {
            ...options,
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json',
              ...options.headers,
            },
          }, true);
        }
        forceLogout('Sesi Anda telah berakhir. Silakan login ulang.');
        throw { status: 401, message: 'Session expired' };
      }
      
      const errorBody = await response.text();
      let error;
      try {
        error = JSON.parse(errorBody);
      } catch {
        error = { message: errorBody };
      }
      console.error('DRIVE API ERROR:', response.status, error);
      throw { status: response.status, ...error };
    }
    
    return response.json();
  } catch (err: any) {
    if (err.status) throw err;
    console.error('DRIVE FETCH ERROR:', err);
    throw { status: 500, message: err.message || 'Connection error' };
  }
}

export function setAccessToken(token: string) {
  if (token) localStorage.setItem('edu_token', token);
}

export function getAccessToken(): string {
  return getTokenFromSession();
}

// Cache IDs in memory to avoid redundant searches
let cachedRootFolderId: string | null = null;
const cachedFileIds: Record<string, string> = {};

/**
 * Find or create the root folder EduTest_Data
 */
export async function getOrCreateRootFolder() {
  if (cachedRootFolderId) return cachedRootFolderId;
  const savedId = localStorage.getItem('edu_root_folder_id');
  if (savedId) {
    cachedRootFolderId = savedId;
    return savedId;
  }

  const folderName = 'EduTest_Data';
  try {
    const response = await fetchApi(`/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`);
    const files = response.files;
    if (files && files.length > 0) {
      const folderId = files[0].id;
      cachedRootFolderId = folderId;
      localStorage.setItem('edu_root_folder_id', folderId);
      return folderId;
    }

    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await fetchApi('/files?fields=id', {
      method: 'POST',
      body: JSON.stringify(folderMetadata),
    });

    cachedRootFolderId = folder.id;
    localStorage.setItem('edu_root_folder_id', folder.id);
    return folder.id;
  } catch (error: any) {
    console.error('getOrCreateRootFolder error:', error);
    throw error;
  }
}

/**
 * Generic function to save/update JSON data in Drive
 */
export async function saveJsonToDrive(folderId: string, fileName: string, data: any) {
  const token = await getValidTokenOrThrow().catch(() => getTokenFromSession());
  if (!token) throw new Error('No access token');
  
  try {
    let fileId = cachedFileIds[fileName];
    if (!fileId) {
      const escapedFileName = fileName.replace(/'/g, "\\'");
      const searchResponse = await fetchApi(`/files?q=name='${escapedFileName}' and '${folderId}' in parents and trashed=false&fields=files(id)`);
      const existingFiles = searchResponse.files;
      fileId = existingFiles && existingFiles.length > 0 ? existingFiles[0].id : null;
      if (fileId) cachedFileIds[fileName] = fileId;
    }

    const fileContent = JSON.stringify(data, null, 2);
    const contentType = 'application/json';

    const doPatch = async (t: string) => {
      const response = await fetch(`${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${t}`,
          'Content-Type': contentType,
        },
        body: fileContent,
      });
      return response;
    };

    if (fileId) {
      let response = await doPatch(token);
      if (response.status === 401) {
        const newToken = await getValidTokenOrThrow().catch(() => null);
        if (newToken) response = await doPatch(newToken);
      }
      if (!response.ok) throw await response.json();
      return { id: fileId, status: 'updated' };
    } else {
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const metadata = {
        name: fileName,
        mimeType: contentType,
        parents: [folderId],
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n\r\n' +
        fileContent +
        close_delim;

      const doPost = async (t: string) => {
        const response = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${t}`,
            'Content-Type': 'multipart/related; boundary="' + boundary + '"',
          },
          body: multipartRequestBody,
        });
        return response;
      };

      let response = await doPost(token);
      if (response.status === 401) {
        const newToken = await getValidTokenOrThrow().catch(() => null);
        if (newToken) response = await doPost(newToken);
      }
      
      if (!response.ok) {
        const errBody = await response.text();
        try {
          throw JSON.parse(errBody);
        } catch {
          throw { message: errBody };
        }
      }
      
      const result = await response.json();
      cachedFileIds[fileName] = result.id;
      return { id: result.id, status: 'created' };
    }
  } catch (error) {
    console.error('saveJsonToDrive error:', error);
    throw error;
  }
}

/**
 * Read JSON data from a file in Drive
 */
export async function readJsonFromDrive(folderId: string, fileName: string) {
  const token = await getValidTokenOrThrow().catch(() => getTokenFromSession());
  if (!token) return null;
  
  try {
    let fileId = cachedFileIds[fileName];
    if (!fileId) {
      const escapedFileName = fileName.replace(/'/g, "\\'");
      const response = await fetchApi(`/files?q=name='${escapedFileName}' and '${folderId}' in parents and trashed=false&fields=files(id)&t=${Date.now()}`);
      const files = response.files;
      if (files && files.length > 0) {
        fileId = files[0].id;
        cachedFileIds[fileName] = fileId;
      }
    }

    if (fileId) {
      const meta = await fetchApi(`/files/${fileId}?fields=modifiedTime&t=${Date.now()}`);
      
      const downloadFile = async (t: string) => {
        return fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${t}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
        });
      };
      
      let fileData = await downloadFile(token);
      if (fileData.status === 401) {
        const newToken = await getValidTokenOrThrow().catch(() => null);
        if (newToken) fileData = await downloadFile(newToken);
      }
      if (!fileData.ok) return null;
      const content = await fileData.json();
      return { data: content, modifiedTime: meta.modifiedTime };
    }
    return null;
  } catch (error) {
    console.error('readJsonFromDrive error:', error);
    return null;
  }
}

export async function fetchExamFromUrl(fileId: string) {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbyAl_WgezDs5k7OSZrulV4dFPbx2l9wjYXMthft_cf1a1AlmgEBnOxEeJ7FrPSfG5-w/exec';
  const t = Date.now();
  const response = await fetch(`${GAS_URL}?fileId=${fileId}&t=${t}`);
  if (!response.ok) throw new Error('Gagal memuat ujian melalui Server.');
  return await response.json();
}

export async function makeFilePublic(fileId: string) {
  const token = localStorage.getItem('edu_token');
  if (!token) return false;
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });
    return response.ok;
  } catch (error) {
    console.error('Error making file public:', error);
    return false;
  }
}

export async function deleteFileFromDrive(fileId: string) {
  const token = getTokenFromSession();
  if (!token || !fileId) return false;
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.ok;
  } catch (err) {
    console.error('deleteFileFromDrive error:', err);
    return false;
  }
}

/**
 * Upload a binary file (Image/PDF/etc) to Google Drive
 */
export async function uploadFileToDrive(file: File, folderId: string) {
  const token = getTokenFromSession();
  if (!token) throw new Error('No access token');

  const metadata = {
    name: `${Date.now()}_${file.name}`,
    parents: [folderId],
  };

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      const contentType = file.type || 'application/octet-stream';
      const base64Data = (reader.result as string).split(',')[1];
      
      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        base64Data +
        close_delim;

      try {
        const response = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/related; boundary="' + boundary + '"',
          },
          body: multipartRequestBody,
        });

        if (!response.ok) throw await response.json();
        const result = await response.json();
        
        // Make it public
        await makeFilePublic(result.id);
        
        resolve(result.id);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Get a direct viewable URL for a Google Drive file id
 */
export function getFileUrl(fileId: string) {
  if (!fileId) return '';
  // thumbnail url is often the most reliable way to get a direct image bypass
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

export async function initGapiClient(apiKey: string) {
  return true;
}