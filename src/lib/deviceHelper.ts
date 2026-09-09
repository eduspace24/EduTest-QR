/**
 * Device & Browser Compatibility Helper for Nineteen Exam
 * Specially tuned for iPhone (iOS Safari / WebKit), Android, and desktop devices.
 */

/**
 * Detects if the current device is running iOS (iPhone, iPad, iPod)
 * or iPadOS (which often identifies as MacIntel with touch points).
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isAppleTouch = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  
  return isAppleTouch || isIPadOS;
}

/**
 * Detects specifically if the device is an iPhone or iPod (phone form factor).
 */
export function isIPhone(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  return /iPhone|iPod/.test(userAgent);
}

/**
 * Detects if the browser is Safari on iOS/macOS.
 */
export function isSafari(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
}

/**
 * Checks whether the browser and device support the Fullscreen API
 * on ordinary DOM elements. On iPhone Safari, element.requestFullscreen is NOT supported.
 */
export function supportsFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const docEl = document.documentElement as any;
  return Boolean(
    docEl.requestFullscreen ||
    docEl.webkitRequestFullscreen ||
    docEl.mozRequestFullScreen ||
    docEl.msRequestFullscreen
  ) && !isIPhone(); // iPhone Safari only supports fullscreen on HTMLVideoElement
}

/**
 * Safely requests fullscreen on devices that support it.
 * Returns true if fullscreen was requested, false if unsupported or failed.
 */
export async function requestFullscreenSafe(element?: HTMLElement): Promise<boolean> {
  if (!supportsFullscreen()) return false;
  
  try {
    const target = (element || document.documentElement) as any;
    if (target.requestFullscreen) {
      await target.requestFullscreen();
      return true;
    } else if (target.webkitRequestFullscreen) {
      await target.webkitRequestFullscreen();
      return true;
    } else if (target.mozRequestFullScreen) {
      await target.mozRequestFullScreen();
      return true;
    } else if (target.msRequestFullscreen) {
      await target.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Fullscreen request bypassed/rejected:', err);
  }
  return false;
}

/**
 * Safely exits fullscreen if currently in fullscreen.
 */
export async function exitFullscreenSafe(): Promise<void> {
  if (typeof document === 'undefined') return;
  try {
    const doc = document as any;
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    }
  } catch (err) {
    console.warn('Exit fullscreen bypassed:', err);
  }
}

// =========================================================================
// SCREEN WAKE LOCK (Mencegah layar iPhone / Android mati otomatis saat membaca soal)
// =========================================================================

let activeWakeLock: any = null;
let keepAliveInterval: any = null;

/**
 * Requests a screen wake lock so the device screen stays ON while taking an exam.
 * Crucial for iPhone because screen auto-lock (e.g. 30s) triggers a false "tab-switch" violation.
 */
export async function acquireScreenWakeLock(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;

  // 1. Modern Screen Wake Lock API (iOS 16.4+, Chrome, Edge, Android)
  if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
    try {
      activeWakeLock = await (navigator as any).wakeLock.request('screen');
      activeWakeLock.addEventListener('release', () => {
        activeWakeLock = null;
      });
      return true;
    } catch (err: any) {
      console.warn('Screen Wake Lock request note:', err?.message || err);
    }
  }

  // 2. Fallback Keep-Alive for older iOS / browsers without WakeLock:
  // Periodic subtle DOM activity to help keep the session active
  if (!keepAliveInterval && typeof window !== 'undefined') {
    keepAliveInterval = setInterval(() => {
      // Subtle heartbeat
      const heartbeat = document.getElementById('screen-wake-heartbeat');
      if (heartbeat) {
        heartbeat.style.opacity = heartbeat.style.opacity === '0.01' ? '0.02' : '0.01';
      }
    }, 15000);
  }

  return false;
}

/**
 * Releases the active screen wake lock when the student finishes or leaves the exam.
 */
export async function releaseScreenWakeLock(): Promise<void> {
  if (activeWakeLock) {
    try {
      await activeWakeLock.release();
    } catch {}
    activeWakeLock = null;
  }
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

/**
 * Hides the mobile address bar on mobile devices (e.g. iPhone) by scrolling slightly.
 */
export function hideMobileAddressBar(): void {
  if (typeof window === 'undefined') return;
  try {
    window.scrollTo({ top: 1, behavior: 'instant' as any });
  } catch {}
}
