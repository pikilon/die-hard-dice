import { useT } from '../i18n';
import { dismissInstall, promptInstall, useInstall } from './install';

/** Floating card under the top bar: install the app (FR-312..315). Never shown inside the installed app. */
export function InstallBanner({ top }: { top?: number }) {
  const t = useT();
  const { show, canInstall } = useInstall();
  if (!show) return null;
  return (
    <div className="install-banner" role="region" aria-label={t('pwa.install')} style={top != null ? { top } : undefined}>
      <span className="install-text">{canInstall ? t('pwa.installPrompt') : t('pwa.installIos')}</span>
      {canInstall && (
        <button className="btn primary sm" onClick={promptInstall}>
          {t('pwa.installAction')}
        </button>
      )}
      <button className="btn ghost sm icon" aria-label={t('pwa.later')} onClick={dismissInstall}>
        ✕
      </button>
    </div>
  );
}
