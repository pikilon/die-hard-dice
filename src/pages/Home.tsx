import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { backgroundUrl } from '../data/backgrounds';
import { useName, useT } from '../i18n';
import type { DiceSet } from '../model/types';
import { promptInstall, useInstall } from '../pwa/install';
import { useLibrary } from '../store/library';
import { DieThumb } from '../ui/DieThumb';
import { confirmDialog, promptDialog, toast } from '../ui/feedback';
import { Icon, Logo } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { ShareLinkModal, ShareModal } from '../ui/ShareModal';
import { cssUrl } from '../ui/css';
import { HomeHero } from './HomeHero';

const HERO_KEY = 'dhd.heroDismissed';
const heroDismissed = () => {
  try {
    return localStorage.getItem(HERO_KEY) === '1';
  } catch {
    return false;
  }
};
const storeHero = (v: boolean) => {
  try {
    if (v) localStorage.setItem(HERO_KEY, '1');
    else localStorage.removeItem(HERO_KEY);
  } catch {
    /* storage unavailable */
  }
};

function SetCard({ set, index, onShare }: { set: DiceSet; index: number; onShare: () => void }) {
  const t = useT();
  const name = useName();
  const [, navigate] = useLocation();
  const dice = useLibrary((s) => s.dice);
  const { cloneSet, deleteSet, moveSet } = useLibrary.getState();
  const [menu, setMenu] = useState(false);
  const list = set.dice.map((id) => dice[id]).filter(Boolean);
  const unique = [...new Map(list.map((d) => [d.id, d])).values()];
  const counts = new Map<string, number>();
  list.forEach((d) => counts.set(d.id, (counts.get(d.id) ?? 0) + 1));

  return (
    <motion.article
      className="card set-card"
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
    >
      <Link href={`/play/${set.id}`} className="set-card-bg" style={{ backgroundImage: cssUrl(backgroundUrl(set.background)) }} aria-label={`${t('common.play')}: ${name(set)}`}>
        <div className="set-card-dice">
          {unique.slice(0, 6).map((d) => (
            <span key={d.id} className="set-card-die">
              <DieThumb die={d} size={56} />
              {counts.get(d.id)! > 1 && <span className="count">×{counts.get(d.id)}</span>}
            </span>
          ))}
          {unique.length > 6 && <span className="badge">+{unique.length - 6}</span>}
        </div>
        <span className="set-card-play">
          <Icon name="play" size={22} />
        </span>
      </Link>
      <div className="set-card-body">
        <div className="set-card-title">
          <h3>{name(set)}</h3>
          <span className="badge">{list.length === 1 ? t('common.die1') : t('common.dice', { n: list.length })}</span>
        </div>
        {set.description && <p className="muted small">{set.description}</p>}
        <div className="row">
          <Link href={`/play/${set.id}`} className="btn primary sm">
            <Icon name="play" size={16} /> {t('common.play')}
          </Link>
          <Link href={`/sets/${set.id}`} className="btn sm">
            <Icon name="edit" size={16} /> {t('common.edit')}
          </Link>
          <span className="spacer" />
          <button className="btn sm icon" onClick={onShare} aria-label={t('common.share')} title={t('common.share')}>
            <Icon name="share" size={16} />
          </button>
          <div className="menu-wrap">
            <button className="btn sm icon" onClick={() => setMenu((m) => !m)} aria-label={t('common.more')} title={t('common.more')}>
              <Icon name="dots" size={16} />
            </button>
            {menu && (
              <div className="pop-menu" onMouseLeave={() => setMenu(false)}>
                <button
                  className="ctx-item"
                  onClick={async () => {
                    setMenu(false);
                    const n = await promptDialog({ title: t('set.saveAsPrompt'), value: `${name(set)} ${t('lib.copySuffix')}` });
                    if (!n) return;
                    const c = cloneSet(set.id, n);
                    if (c) navigate(`/sets/${c.id}`);
                  }}
                >
                  <Icon name="copy" size={16} /> {t('common.clone')}
                </button>
                <button className="ctx-item" onClick={() => (moveSet(set.id, -1), setMenu(false))}>
                  <Icon name="chevronUp" size={16} /> {t('home.moveUp')}
                </button>
                <button className="ctx-item" onClick={() => (moveSet(set.id, 1), setMenu(false))}>
                  <Icon name="chevronDown" size={16} /> {t('home.moveDown')}
                </button>
                <button
                  className="ctx-item danger"
                  onClick={async () => {
                    setMenu(false);
                    if (await confirmDialog({ title: t('common.delete'), body: t('common.confirmDelete', { name: name(set) }), danger: true, confirm: t('common.delete') }))
                      deleteSet(set.id);
                  }}
                >
                  <Icon name="trash" size={16} /> {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function Home() {
  const t = useT();
  const sets = useLibrary((s) => s.sets);
  const order = useLibrary((s) => s.setOrder);
  const restore = useLibrary((s) => s.restoreDefaults);
  const [sharing, setSharing] = useState<DiceSet | null>(null);
  const [sharingApp, setSharingApp] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [hero, setHero] = useState(() => !heroDismissed());
  const { isStandalone, canInstall, isIOS } = useInstall();
  const list = order.map((id) => sets[id]).filter(Boolean);
  /** Root of the site (no `#`, no payload): opening it lands on this Home (FR-503). */
  const appUrl = typeof location === 'undefined' ? '' : location.href.split(/[?#]/)[0];
  /** Not installed yet and we have a way to offer it (FR-508). */
  const offerInstall = !isStandalone && (canInstall || isIOS);

  return (
    <div className="page">
      <header className="home-brand">
        <Logo size={46} />
        <div className="home-brand-copy">
          <h1>{t('app.name')}</h1>
          <p>{t('app.tagline')}</p>
        </div>
        <div className="home-brand-actions">
          {offerInstall && (
            <button className="btn" onClick={() => (canInstall ? promptInstall() : setIosHelp(true))}>
              <Icon name="phone" size={18} /> {t('pwa.install')}
            </button>
          )}
          <button className="btn" onClick={() => setSharingApp(true)} title={t('app.shareTitle')}>
            <Icon name="share" size={18} /> {t('app.share')}
          </button>
        </div>
      </header>
      {hero && (
        <HomeHero
          onDismiss={() => {
            storeHero(true);
            setHero(false);
          }}
        />
      )}
      <div className="page-head">
        <div>
          <h2>{t('home.title')}</h2>
          <p>{t('home.subtitle')}</p>
        </div>
        <div className="row">
          {!hero && (
            <button
              className="btn ghost sm"
              onClick={() => {
                storeHero(false);
                setHero(true);
              }}
            >
              <Icon name="info" size={16} /> {t('hero.show')}
            </button>
          )}
          <Link href="/sets/new" className="btn primary">
            <Icon name="plus" /> {t('home.newSet')}
          </Link>
        </div>
      </div>
      <div className="grid-cards">
        {list.map((s, i) => (
          <SetCard key={s.id} set={s} index={i} onShare={() => setSharing(s)} />
        ))}
      </div>
      <div className="row" style={{ marginTop: 28, justifyContent: 'center' }}>
        <button
          className="btn ghost sm"
          onClick={async () => {
            if (await confirmDialog({ title: t('home.restore'), body: t('home.restoreConfirm') })) {
              restore();
              toast(t('home.restored'));
            }
          }}
        >
          <Icon name="refresh" size={16} /> {t('home.restore')}
        </button>
      </div>
      <ShareModal set={sharing} open={!!sharing} onClose={() => setSharing(null)} />
      <ShareLinkModal
        open={sharingApp}
        onClose={() => setSharingApp(false)}
        title={t('app.shareTitle')}
        body={t('app.shareBody')}
        url={appUrl}
        nativeTitle={t('app.name')}
      />
      <Modal open={iosHelp} onClose={() => setIosHelp(false)} title={t('pwa.install')}>
        <p style={{ margin: 0 }}>{t('pwa.installIos')}</p>
      </Modal>
    </div>
  );
}
