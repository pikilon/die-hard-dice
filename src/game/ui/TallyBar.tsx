import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef, type MouseEvent, type PointerEvent } from 'react';
import { useName, useT } from '../../i18n';
import { resolveFace } from '../../model/faces';
import { solidFor } from '../../model/solids';
import { computeTally } from '../../model/tally';
import type { DiceSet } from '../../model/types';
import { useLibrary } from '../../store/library';
import { useTable } from '../../store/table';
import { FaceChip } from '../../ui/FaceChip';

export function TallyBar({ set }: { set: DiceSet }) {
  const t = useT();
  const name = useName();
  const dice = useTable((s) => s.dice);
  const rt = useTable((s) => s.rt);
  const selected = useTable((s) => s.selected);
  const phase = useTable((s) => s.phase);
  const rolling = useTable((s) => s.rolling);
  const entryId = useTable((s) => s.entryId);
  const toggle = useTable((s) => s.toggleSelect);
  const openMenu = useTable((s) => s.openMenu);
  const lib = useLibrary((s) => s.dice);
  const press = useRef<{ uid: string; timer: number; fired: boolean } | null>(null);

  const items = useMemo(
    () =>
      dice
        .filter((d) => lib[d.dieId] && rt[d.uid]?.face != null)
        .map((d) => ({ uid: d.uid, die: lib[d.dieId], face: rt[d.uid].face! })),
    [dice, lib, rt],
  );
  const tally = useMemo(() => computeTally(items, set.tally), [items, set.tally]);
  const mixed = new Set(dice.map((d) => (lib[d.dieId] ? solidFor(lib[d.dieId].faces) : ''))).size > 1;
  const anyResult = items.length > 0;
  const busy = phase !== 'idle';

  const menuAt = (uid: string, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    openMenu({ uid, x: r.left + r.width / 2, y: r.top });
  };
  const onDown = (uid: string) => (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const el = e.currentTarget as HTMLElement;
    press.current = { uid, fired: false, timer: window.setTimeout(() => {
      if (press.current) press.current.fired = true;
      menuAt(uid, el);
    }, 520) };
  };
  const onUp = () => {
    if (press.current) clearTimeout(press.current.timer);
  };
  const onClick = (uid: string) => (e: MouseEvent) => {
    if (press.current?.fired) {
      press.current = null;
      return;
    }
    press.current = null;
    e.stopPropagation();
    if (!busy) toggle(uid);
  };
  const onCtx = (uid: string) => (e: MouseEvent) => {
    e.preventDefault();
    if (!busy) menuAt(uid, e.currentTarget as HTMLElement);
  };

  return (
    <div className="tally">
      {!anyResult && !busy && <div className="tally-empty">{t('play.noResults')}</div>}
      {busy && !anyResult && <div className="tally-empty shimmer">{t('play.rolling')}</div>}
      {anyResult && (
        <>
          <div className="tally-chips" aria-label={t('play.results')}>
            <AnimatePresence initial={false} mode="popLayout">
              {dice.map((d, i) => {
                const die = lib[d.dieId];
                const r = rt[d.uid];
                if (!die || !r) return null;
                const isRolling = rolling.includes(d.uid) && busy;
                if (r.face == null || isRolling)
                  return (
                    <motion.span key={`${d.uid}-pending`} className="tally-slot pending" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <span className="face-chip ghost" style={{ ['--size' as string]: '44px', borderColor: die.color }}>?</span>
                    </motion.span>
                  );
                const face = resolveFace(die, r.face);
                return (
                  <motion.span
                    key={`${d.uid}-${entryId}-${r.face}-${r.rerolled ? 'r' : ''}`}
                    className="tally-slot"
                    layout
                    initial={{ opacity: 0, y: -26, rotate: -25, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22, delay: i * 0.035 }}
                    onPointerDown={onDown(d.uid)}
                    onPointerUp={onUp}
                    onPointerLeave={onUp}
                  >
                    <FaceChip
                      face={face}
                      size={44}
                      selected={selected.includes(d.uid)}
                      onClick={onClick(d.uid)}
                      onContextMenu={onCtx(d.uid)}
                      title={name(die)}
                      style={{ boxShadow: `0 0 0 2px ${die.color}, inset 0 -3px 0 rgba(0,0,0,.25), 0 4px 10px rgba(0,0,0,.4)` }}
                    >
                      {r.original != null && <span className="chip-badge alt">✎</span>}
                      {r.rerolled && <span className="chip-badge re">↻</span>}
                    </FaceChip>
                    {mixed && <span className="chip-solid">{t(`solid.${solidFor(die.faces)}`)}</span>}
                  </motion.span>
                );
              })}
            </AnimatePresence>
          </div>
          <div className="tally-summary">
            {set.tally.sum && tally.hasNumbers && (
              <motion.div className="tally-sum" key={`sum-${tally.sum}-${entryId}`} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <span className="label">Σ</span>
                <span className="value">{tally.sum}</span>
              </motion.div>
            )}
            {tally.groups.length > 0 && (
              <div className="tally-groups">
                {tally.groups.map((g) => (
                  <span key={g.key} className="tally-group">
                    <b>{g.count}</b>
                    <span className="x">×</span>
                    <FaceChip face={g.face} size={30} />
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
