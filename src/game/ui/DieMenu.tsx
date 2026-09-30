import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useName, useT } from '../../i18n';
import { resolveFace } from '../../model/faces';
import { useLibrary } from '../../store/library';
import { useTable } from '../../store/table';
import { FaceChip } from '../../ui/FaceChip';
import { Icon } from '../../ui/Icon';
import { director } from '../director';
import { alterFace, removeFromTable } from '../session';

const GRID_LIMIT = 60;

/** Context menu for a die on the table (or its chip in the tally). */
export function DieMenu() {
  const t = useT();
  const name = useName();
  const menu = useTable((s) => s.menu);
  const close = useTable((s) => s.closeMenu);
  const td = useTable((s) => (s.menu ? s.dice.find((d) => d.uid === s.menu!.uid) : undefined));
  const rt = useTable((s) => (s.menu ? s.rt[s.menu.uid] : undefined));
  const selected = useTable((s) => (s.menu ? s.selected.includes(s.menu.uid) : false));
  const toggle = useTable((s) => s.toggleSelect);
  const die = useLibrary((s) => (td ? s.dice[td.dieId] : undefined));
  const [showValues, setShowValues] = useState(false);
  const [num, setNum] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setShowValues(false);
    setNum('');
  }, [menu?.uid]);

  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const pad = 8;
    let x = menu.x - r.width / 2;
    let y = menu.y - r.height - 12;
    if (y < pad) y = Math.min(window.innerHeight - r.height - pad, menu.y + 16);
    x = Math.max(pad, Math.min(window.innerWidth - r.width - pad, x));
    setPos({ x, y: Math.max(pad, y) });
  }, [menu, showValues]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const h = setTimeout(() => window.addEventListener('pointerdown', onDown), 0);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(h);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu, close]);

  const setValue = (face: number) => {
    if (!menu) return;
    alterFace(menu.uid, face);
    director.showFace(menu.uid, face);
    close();
  };

  return (
    <AnimatePresence>
      {menu && die && rt && (
        <motion.div
          ref={ref}
          className="ctx-menu"
          role="menu"
          style={{ left: pos.x, top: pos.y }}
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.14 }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="ctx-title">
            {rt.face != null && <FaceChip face={resolveFace(die, rt.face)} size={30} />}
            <span>{name(die)}</span>
          </div>
          {rt.face != null && (
            <button className="ctx-item" role="menuitem" onClick={() => setShowValues((v) => !v)}>
              <Icon name="edit" size={18} /> {t('ctx.changeValue')}
              <span className="spacer" />
              <Icon name={showValues ? 'chevronUp' : 'chevronDown'} size={16} />
            </button>
          )}
          {showValues && die.faces <= GRID_LIMIT && (
            <div className="ctx-values">
              {Array.from({ length: die.faces }, (_, i) => i + 1).map((f) => (
                <FaceChip key={f} face={resolveFace(die, f)} size={40} selected={f === rt.face} onClick={() => setValue(f)} title={`${f}`} />
              ))}
            </div>
          )}
          {showValues && die.faces > GRID_LIMIT && (
            <div className="row" style={{ padding: 8 }}>
              <input
                className="input num"
                type="number"
                min={1}
                max={die.faces}
                value={num}
                placeholder={`1–${die.faces}`}
                onChange={(e) => setNum(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && Number(num) >= 1 && Number(num) <= die.faces && setValue(Number(num))}
              />
              {Number(num) >= 1 && Number(num) <= die.faces && <FaceChip face={resolveFace(die, Number(num))} size={36} onClick={() => setValue(Number(num))} />}
            </div>
          )}
          {rt.original != null && (
            <button className="ctx-item" role="menuitem" onClick={() => setValue(rt.original!)}>
              <Icon name="undo" size={18} /> {t('ctx.restore', { v: 't' in resolveFace(die, rt.original).value ? (resolveFace(die, rt.original).value as { t: string }).t : '★' })}
            </button>
          )}
          {rt.face != null && (
            <button
              className="ctx-item"
              role="menuitem"
              onClick={() => {
                toggle(menu.uid);
                close();
              }}
            >
              <Icon name="target" size={18} /> {selected ? t('ctx.unselect') : t('ctx.select')}
            </button>
          )}
          <button
            className="ctx-item danger"
            role="menuitem"
            onClick={() => {
              removeFromTable(menu.uid);
              close();
            }}
          >
            <Icon name="trash" size={18} /> {t('ctx.remove')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
