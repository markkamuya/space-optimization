export const OFFLINE_STATUS_MESSAGE = 'ATLAS_OFFLINE_STATUS';

export async function registerOfflineCache(serviceWorker = navigator.serviceWorker) {
  if (!serviceWorker?.register || !globalThis.isSecureContext) return { supported: false, reason: 'unsupported' };
  try {
    const registration = await serviceWorker.register('/sw.js', { scope: '/' });
    return { supported: true, registration };
  } catch {
    return { supported: false, reason: 'registration_failed' };
  }
}

export async function requestOfflineCacheStatus(serviceWorker = navigator.serviceWorker, timeoutMs = 1500) {
  const worker = serviceWorker?.controller;
  if (!worker) return { available: false, entries: 0, reason: 'not_controlling' };
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      serviceWorker.removeEventListener('message', onMessage);
      resolve({ available: false, entries: 0, reason: 'timeout' });
    }, timeoutMs);
    function onMessage(event) {
      if (event.data?.type !== OFFLINE_STATUS_MESSAGE) return;
      clearTimeout(timer);
      serviceWorker.removeEventListener('message', onMessage);
      resolve({ available: event.data.entries > 0, entries: event.data.entries, version: event.data.version });
    }
    serviceWorker.addEventListener('message', onMessage);
    worker.postMessage({ type: OFFLINE_STATUS_MESSAGE });
  });
}
