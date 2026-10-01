import { useT } from '../i18n';
import { applyUpdate, dismissOffline, dismissUpdate, usePwa } from './register';

/** Non-blocking banner: a new version is waiting (FR-353) or the app is ready offline (FR-356). */
export function UpdateBanner() {
  const t = useT();
  const { needRefresh, offlineReady } = usePwa();
  if (!needRefresh && !offlineReady) return null;
  return (
    <div className="update-banner" role="status">
      <span>{needRefresh ? t('pwa.updateAvailable') : t('pwa.offlineReady')}</span>
      {needRefresh && (
        <button className="btn primary sm" onClick={applyUpdate}>
          {t('pwa.update')}
        </button>
      )}
      <button className="btn ghost sm icon" aria-label={t('pwa.later')} onClick={needRefresh ? dismissUpdate : dismissOffline}>
        ✕
      </button>
    </div>
  );
}
