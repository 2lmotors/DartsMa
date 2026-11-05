// Screen Wake Lock API to prevent phone/tablet from sleeping during a match

let wakeLock = null;

export async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        // Released
      });
      return true;
    } catch (err) {
      console.warn('Wake Lock error:', err);
    }
  }
  return false;
}

export function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

// Hook to keep wake lock active and re-request upon tab re-entry
export function initAutoWakeLock() {
  requestWakeLock();

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    releaseWakeLock();
  };
}

