import { registerSW } from 'virtual:pwa-register';
import { showToast } from '../ui/toast.js';

export function registerPwa() {
  const updateSW = registerSW({
    onNeedRefresh() {
      showToast('A new version is available.', {
        duration: 0,
        action: { label: 'Reload', onClick: () => updateSW(true) }
      });
    },
    onOfflineReady() {
      showToast('Ready to use offline.', { duration: 4000 });
    },
    onRegisteredSW() {
      // First registration — quietly request persistent storage so iOS doesn't
      // evict our caches under pressure. Best-effort; ignored if unavailable.
      if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    }
  });
}
