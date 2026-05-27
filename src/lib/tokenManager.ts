declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void;
            error_callback?: () => void;
          }) => {
            requestAccessToken: (config?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

const CLIENT_ID = "974466081867-16jf202lss43nh2bq336if1liuqdohgq.apps.googleusercontent.com";
const SCOPES = 'openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file';
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export function getStoredToken(): string | null {
  return localStorage.getItem('edu_token');
}

export function getTokenExpiry(): number | null {
  const expiry = localStorage.getItem('edu_token_expiry');
  return expiry ? parseInt(expiry) : null;
}

export function setTokenData(token: string, expiresIn?: number): void {
  localStorage.setItem('edu_token', token);
  if (expiresIn) {
    localStorage.setItem('edu_token_expiry', String(Date.now() + expiresIn * 1000));
  }
}

export function clearTokenData(): void {
  localStorage.removeItem('edu_token');
  localStorage.removeItem('edu_token_expiry');
}

export function isTokenExpired(): boolean {
  const expiry = getTokenExpiry();
  if (!expiry) return false;
  return Date.now() + EXPIRY_BUFFER_MS >= expiry;
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem('edu_session');
}

export function silentRefreshToken(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const g = (typeof window !== 'undefined') ? window.google : undefined;
      if (!g?.accounts?.oauth2) {
        resolve(null);
        return;
      }

      const tokenClient = g.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            setTokenData(response.access_token, response.expires_in);
            resolve(response.access_token);
          } else {
            resolve(null);
          }
        },
        error_callback: () => resolve(null),
      });

      tokenClient.requestAccessToken({ prompt: '' });
    } catch {
      resolve(null);
    }
  });
}

export async function ensureValidToken(): Promise<string | null> {
  const token = getStoredToken();
  if (!token) return null;

  if (isTokenExpired()) {
    const newToken = await silentRefreshToken();
    if (newToken) return newToken;
    return null;
  }

  return token;
}

export function forceLogout(message = 'Sesi berakhir. Silakan login ulang.'): void {
  clearTokenData();
  localStorage.removeItem('edu_session');
  localStorage.removeItem('edu_root_folder_id');
  window.location.href = '/login?error=' + encodeURIComponent(message);
}
