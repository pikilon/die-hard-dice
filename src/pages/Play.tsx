import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { backgroundBase, backgroundUrl } from '../data/backgrounds';
import { director } from '../game/director';
import { isTouch, rollButtonHandlers, useTableInput } from '../game/input';
import { GameScene, type Insets } from '../game/Scene';
import { addToTable } from '../game/session';
import { DieMenu } from '../game/ui/DieMenu';
import { HistoryPanel } from '../game/ui/HistoryPanel';
import { TallyBar } from '../game/ui/TallyBar';
import { useName, useT } from '../i18n';
import { useLibrary } from '../store/library';
import { useSettings } from '../store/settings';
import { useTable } from '../store/table';
import { DiePicker } from '../ui/DiePicker';
import { HAND_PATH, Icon } from '../ui/Icon';
import { cssUrl } from '../ui/css';
import { ShareModal } from '../ui/ShareModal';

function Hint() {
  const t = useT();
  const phase = useTable((s) => s.phase);
  const motionShake = useTable((s) => s.motionShake);
  const entryId = useTable((s) => s.entryId);
  const touch = isTouch();
  let text: string | null = null;
  const grab = phase === 'waiting';
  if (grab) text = t('play.hintGrab');
  else if (motionShake) text = t('play.hintMotion');
  else if (phase === 'shaking' || phase === 'gathering') text = t('play.hintDrag');
  else if (phase === 'idle' && !entryId) text = t('play.hintDrag');
  else if (phase === 'idle' && entryId) text = touch ? t('play.hintTapDie') : t('play.hintClickDie');
  return (
    <div className="play-hint-wrap" aria-live="polite">
      <AnimatePresence mode="wait">
        {text && (
          <motion.div key={text} className={`play-hint ${motionShake || grab ? 'pulse' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            {grab ? <Icon name="hand" size={18} /> : motionShake && <Icon name="phone" size={16} />} {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Big animated call to action over the waiting cup: a hand pressing it and bouncing letters. */
function GrabPrompt() {
  const t = useT();
  const waiting = useTable((s) => s.phase === 'waiting');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!waiting) return;
    let raf = 0;
    const follow = () => {
      const p = director.cupScreen();
      if (p && box.current) {
        box.current.style.left = `${p.x}px`;
        box.current.style.top = `${p.y}px`;
        box.current.style.visibility = 'visible';
      }
      raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
  }, [waiting]);
  if (!waiting) return null;
  const text = t('play.grabBig');
  return (
    <div className="grab-prompt" ref={box} style={{ visibility: 'hidden' }} aria-hidden="true">
      <svg className="grab-hand" viewBox="0 0 24 24" width="84" height="84" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={HAND_PATH} />
      </svg>
      <div className="grab-text">
        {[...text].map((c, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.07}s` }}>
            {c === ' ' ? '\u00a0' : c}
          </span>
        ))}
      </div>
    </div>
  );
}

function RollButtons() {
  const t = useT();
  const selected = useTable((s) => s.selected);
  const phase = useTable((s) => s.phase);
  const count = useTable((s) => s.dice.length);
  const entryId = useTable((s) => s.entryId);
  const clear = useTable((s) => s.clearSelection);
  const busy = phase !== 'idle';
  const all = useRef(rollButtonHandlers(() => undefined)).current;
  const some = useRef(rollButtonHandlers(() => useTable.getState().selected)).current;
  const canReroll = selected.length > 0 && selected.length < count && !!entryId;
  return (
    <div className="roll-actions">
      <AnimatePresence>
        {canReroll && !busy && (
          <motion.div className="reroll-group" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <button className="btn sm ghost" onClick={clear} title={t('play.clearSel')}>
              <Icon name="close" size={16} />
            </button>
            <button className="btn reroll-btn" {...some}>
              <Icon name="refresh" /> {t('play.reroll', { n: selected.length })}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button className={`roll-btn ${busy ? 'busy' : ''}`} disabled={count === 0} {...all} aria-label={t('play.roll')}>
        <span className="roll-btn-inner">
          <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
            <path d="M32 6l22 12.7v25.4L32 57 10 44.1V18.7z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
            <path d="M32 18l12 20H20z" fill="currentColor" opacity=".9" />
          </svg>
          <span>{t('play.roll')}</span>
        </span>
      </button>
    </div>
  );
}

export function Play({ id }: { id: string }) {
  const t = useT();
  const name = useName();
  const [, navigate] = useLocation();
  const set = useLibrary((s) => s.sets[id]);
  const sets = useLibrary((s) => s.sets);
  const setOrder = useLibrary((s) => s.setOrder);
  const sound = useSettings((s) => s.sound);
  const toggleSound = useSettings((s) => s.toggleSound);
  const showHistory = useSettings((s) => s.showHistory);
  const setShowHistory = useSettings((s) => s.setShowHistory);
  const setLastSet = useSettings((s) => s.setLastSet);
  const tableSet = useTable((s) => s.setId);
  const diceCount = useTable((s) => s.dice.length);
  const [picker, setPicker] = useState(false);
  const [share, setShare] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const [insets, setInsets] = useState<Insets>({ top: 70, bottom: 140 });

  useTableInput(stage);

  // load the set onto the table when it changes
  useEffect(() => {
    if (!set) return;
    setLastSet(set.id);
    const table = useTable.getState();
    const same = table.setId === set.id;
    const sameDice = table.dice.map((d) => d.dieId).join(',') === set.dice.join(',');
    if (same && (sameDice || table.dirty)) return;
    const lib = useLibrary.getState().dice;
    director.reset();
    useTable.getState().load(set.id, set.dice.map((d) => lib[d]).filter(Boolean));
  }, [set, setLastSet]);

  useLayoutEffect(() => {
    const measure = () => {
      const h = window.innerHeight;
      const tb = top.current?.getBoundingClientRect();
      const db = dock.current?.getBoundingClientRect();
      setInsets({ top: tb ? tb.bottom + 6 : 70, bottom: db ? h - db.top + 6 : 140 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (top.current) ro.observe(top.current);
    if (dock.current) ro.observe(dock.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [set]);

  if (!set)
    return (
      <div className="page">
        <div className="empty">
          <p>{t('set.notFound')}</p>
          <Link href="/" className="btn">
            <Icon name="back" /> {t('common.back')}
          </Link>
        </div>
      </div>
    );

  const bg = backgroundUrl(set.background);
  const loaded = tableSet === set.id;

  return (
    <div className="play" style={{ backgroundColor: backgroundBase(set.background), backgroundImage: cssUrl(bg) }}>
      <div className="play-vignette" />
      <div className="play-stage" ref={stage}>
        {loaded && <GameScene insets={insets} />}
      </div>
      <GrabPrompt />

      <div className="play-top" ref={top}>
        <Link href="/" className="btn icon" aria-label={t('common.back')}>
          <Icon name="back" />
        </Link>
        <label className="set-switch" title={t('play.selectSet')}>
          <span className="set-switch-name">{name(set)}</span>
          <Icon name="chevronDown" size={16} />
          <select value={set.id} onChange={(e) => navigate(`/play/${e.target.value}`)} aria-label={t('play.selectSet')}>
            {setOrder
              .map((sid) => sets[sid])
              .filter(Boolean)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {name(s)}
                </option>
              ))}
          </select>
        </label>
        <span className="spacer" />
        <button className="btn icon" onClick={() => setPicker(true)} title={t('play.addDie')} aria-label={t('play.addDie')}>
          <Icon name="plus" />
        </button>
        <button className={`btn icon ${showHistory ? 'primary' : ''}`} onClick={() => setShowHistory(!showHistory)} title={t('play.history')} aria-label={t('play.history')}>
          <Icon name="history" />
        </button>
        <button className="btn icon hide-sm" onClick={() => setShare(true)} title={t('common.share')} aria-label={t('common.share')}>
          <Icon name="share" />
        </button>
        <Link href={`/sets/${set.id}`} className="btn icon hide-sm" title={t('play.editSet')} aria-label={t('play.editSet')}>
          <Icon name="edit" />
        </Link>
        <button className="btn icon" onClick={toggleSound} title={t('nav.sound')} aria-label={t('nav.sound')}>
          <Icon name={sound ? 'soundOn' : 'soundOff'} />
        </button>
      </div>

      {loaded && diceCount === 0 && (
        <div className="play-empty">
          <p>{t('play.emptySet')}</p>
          <button className="btn primary" onClick={() => setPicker(true)}>
            <Icon name="plus" /> {t('play.emptyAction')}
          </button>
        </div>
      )}

      <div className="play-dock" ref={dock}>
        <Hint />
        <div className="dock-panel">
          <TallyBar set={set} />
          <RollButtons />
        </div>
      </div>

      <HistoryPanel open={showHistory} onClose={() => setShowHistory(false)} setId={set.id} tally={set.tally} />
      <DieMenu />
      <DiePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(dieId) => addToTable(dieId)}
        onCreate={() => navigate(`/dice/new?set=${set.id}&play=1`)}
      />
      <ShareModal set={set} open={share} onClose={() => setShare(false)} />
    </div>
  );
}
