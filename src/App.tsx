import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Redirect, Route, Router, Switch, useLocation } from 'wouter';
import { DEFAULT_SET_ID } from './data/presets';
import { useLang, useT } from './i18n';
import type { Lang } from './model/types';
import { Home } from './pages/Home';
import { Import } from './pages/Import';
import { Library } from './pages/Library';
import { SetEditor } from './pages/SetEditor';
import { useHashLocation, useHashSearch } from './router';
import { useLibrary } from './store/library';
import { useSettings } from './store/settings';
import { InstallBanner } from './pwa/InstallBanner';
import { UpdateBanner } from './pwa/UpdateBanner';
import { Dialogs, Toasts } from './ui/feedback';
import { Icon, Logo } from './ui/Icon';
import { Modal } from './ui/Modal';

// the 3D-heavy screens (physics engine, orbit controls) load on demand
const Play = lazy(() => import('./pages/Play').then((m) => ({ default: m.Play })));
const DieEditor = lazy(() => import('./pages/DieEditor').then((m) => ({ default: m.DieEditor })));

function Loading() {
  return (
    <div className="loading">
      <Logo size={56} />
    </div>
  );
}

function LangSwitch() {
  const lang = useLang();
  const setLang = useSettings((s) => s.setLang);
  const t = useT();
  return (
    <div className="segmented" role="group" aria-label={t('nav.language')}>
      {(['es', 'en'] as Lang[]).map((l) => (
        <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function About({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t('about.title')}>
      <div className="stack about">
        <p>{t('about.body')}</p>
        <h3>{t('about.howTo')}</h3>
        <ul>
          <li>{t('about.howTo1')}</li>
          <li>{t('about.howTo2')}</li>
          <li>{t('about.howTo3')}</li>
        </ul>
        <p className="muted small">
          {t('about.icons')}{' '}
          <a href="https://game-icons.net" target="_blank" rel="noreferrer">
            game-icons.net
          </a>{' '}
          ·{' '}
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
            CC BY 3.0
          </a>
        </p>
        <p className="muted small">{t('about.trademarks')}</p>
        <p className="muted small">{t('pwa.version', { v: __APP_VERSION__ })}</p>
      </div>
    </Modal>
  );
}

function Header() {
  const t = useT();
  const [loc] = useLocation();
  const sound = useSettings((s) => s.sound);
  const toggleSound = useSettings((s) => s.toggleSound);
  const lastSet = useSettings((s) => s.lastSetId);
  const sets = useLibrary((s) => s.sets);
  const [about, setAbout] = useState(false);
  const playId = lastSet && sets[lastSet] ? lastSet : sets[DEFAULT_SET_ID] ? DEFAULT_SET_ID : Object.keys(sets)[0];
  const active = (p: string) => (p === '/' ? loc === '/' || loc.startsWith('/sets') : loc.startsWith(p));
  return (
    <header className="app-header">
      <Link href="/" className="brand">
        <Logo />
        <span>{t('app.name')}</span>
      </Link>
      <nav className="nav">
        <Link href="/" className={active('/') ? 'active' : ''}>
          {t('nav.sets')}
        </Link>
        <Link href="/dice" className={active('/dice') ? 'active' : ''}>
          {t('nav.dice')}
        </Link>
      </nav>
      <span className="spacer" />
      <button className="btn ghost icon" onClick={toggleSound} title={t('nav.sound')} aria-label={t('nav.sound')}>
        <Icon name={sound ? 'soundOn' : 'soundOff'} />
      </button>
      <LangSwitch />
      <button className="btn ghost icon hide-sm" onClick={() => setAbout(true)} title={t('nav.about')} aria-label={t('nav.about')}>
        <Icon name="info" />
      </button>
      {playId && (
        <Link href={`/play/${playId}`} className="btn primary">
          <Icon name="play" size={18} /> <span className="hide-sm">{t('nav.play')}</span>
        </Link>
      )}
      <About open={about} onClose={() => setAbout(false)} />
    </header>
  );
}

function Shell() {
  const [loc] = useLocation();
  const playing = loc.startsWith('/play/');
  /** On the Home the install offer lives inside the identity banner (FR-508), so the floating card would overlap it. */
  const home = loc === '/';
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <>
      {!playing && <Header />}
      {!playing && !home && <InstallBanner />}
      <main>
        <Suspense fallback={<Loading />}>
        <Switch>
          <Route path="/">{() => <Home />}</Route>
          <Route path="/dice">{() => <Library />}</Route>
          <Route path="/dice/:id">{(p) => <DieEditor key={p.id} id={p.id} />}</Route>
          <Route path="/sets/:id">{(p) => <SetEditor key={p.id} id={p.id} />}</Route>
          <Route path="/play/:id">{(p) => <Play id={p.id} />}</Route>
          <Route path="/import">{() => <Import />}</Route>
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
        </Suspense>
      </main>
      <Toasts />
      <UpdateBanner />
      <Dialogs />
    </>
  );
}

export function App() {
  return (
    <Router hook={useHashLocation} searchHook={useHashSearch}>
      <Shell />
    </Router>
  );
}
