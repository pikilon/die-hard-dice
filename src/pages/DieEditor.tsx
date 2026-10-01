import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'wouter';
import { addToTable } from '../game/session';
import { useLang, useName, useT } from '../i18n';
import { autoContrast, parseHex } from '../model/color';
import { clampText, defaultValue, faceProps, formatNumber, MAX_FACES, resolveFace } from '../model/faces';
import { isImpossible, slotsFor, solidFor, windowMapping } from '../model/solids';
import { MATERIALS, type Die, type FaceProps, type FaceRange, type FaceValue } from '../model/types';
import { blankDie, setsUsingDie, useLibrary } from '../store/library';
import { ColorPicker } from '../ui/ColorPicker';
import { DiePreview } from '../ui/DiePreview';
import { FaceChip, GameIcon } from '../ui/FaceChip';
import { confirmDialog, toast } from '../ui/feedback';
import { Icon } from '../ui/Icon';
import { IconPicker } from '../ui/IconPicker';
import { Modal } from '../ui/Modal';

const QUICK = [2, 4, 6, 8, 10, 12, 20];

/** A range color that is clearly different from the die body. */
function contrastingAccent(body: string) {
  const [r, g, b] = parseHex(body);
  let best = '#f2c14e';
  let bestD = -1;
  for (const c of ['#f2c14e', '#1c7ed6', '#2f9e44', '#141414', '#f4f1ea', '#c92a2a']) {
    const [r2, g2, b2] = parseHex(c);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (d > bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

const MAT_SWATCH: Record<string, string> = {
  plastic: 'radial-gradient(circle at 35% 30%, #fff 0 6%, #d9463f 7% 60%, #8f1f1b)',
  marble: 'radial-gradient(circle at 35% 30%, #fff 0 5%, transparent 6%), repeating-linear-gradient(35deg, #ece7df 0 7px, #b9b2a6 8px 9px, #ece7df 10px 16px)',
  metal: 'linear-gradient(135deg, #8d8d8d, #f5f5f5 45%, #6e6e6e 55%, #d9d9d9)',
  wood: 'repeating-linear-gradient(90deg, #a0643a 0 5px, #7a4726 6px 8px, #b87848 9px 13px)',
  glass: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.95) 0 8%, rgba(140,200,255,.35) 9% 70%, rgba(40,90,160,.55))',
  stone: 'radial-gradient(circle at 30% 30%, #9a9a94, #5f5f5a), radial-gradient(#222 1px, transparent 1px)',
};

/* ---------------------------------------------------------------- value editor */

function ValueEditor({ value, onChange, allowNone }: { value: FaceValue | undefined; onChange: (v: FaceValue | undefined) => void; allowNone?: boolean }) {
  const t = useT();
  const [tab, setTab] = useState<'none' | 'text' | 'icon'>(!value ? (allowNone ? 'none' : 'text') : 't' in value ? 'text' : 'icon');
  const [text, setText] = useState(value && 't' in value ? value.t : '');
  return (
    <div className="stack">
      <div className="segmented">
        {allowNone && (
          <button type="button" className={tab === 'none' ? 'on' : ''} onClick={() => (setTab('none'), onChange(undefined))}>
            {t('die.unchanged')}
          </button>
        )}
        <button type="button" className={tab === 'text' ? 'on' : ''} onClick={() => (setTab('text'), text && onChange({ t: text }))}>
          Aa {t('die.text')}
        </button>
        <button type="button" className={tab === 'icon' ? 'on' : ''} onClick={() => setTab('icon')}>
          <GameIcon name="death-skull" size={14} /> {t('die.icon')}
        </button>
      </div>
      {tab === 'text' && (
        <div className="field">
          <input
            className="input big"
            value={text}
            placeholder="7 · A · 🐉"
            onChange={(e) => {
              const v = clampText(e.target.value);
              setText(v);
              onChange(v ? { t: v } : allowNone ? undefined : { t: '?' });
            }}
          />
          <span className="muted small">{t('die.textHint')}</span>
        </div>
      )}
      {tab === 'icon' && <IconPicker value={value && 'i' in value ? value.i : undefined} onPick={(i) => onChange({ i })} />}
    </div>
  );
}

/* ---------------------------------------------------------------- single face */

function FaceModal({ die, index, onClose, onChange }: { die: Die; index: number | null; onClose: () => void; onChange: (i: number, p: FaceProps | undefined) => void }) {
  const t = useT();
  if (index == null) return <Modal open={false} onClose={onClose}>{null}</Modal>;
  const o = die.overrides[index] ?? {};
  const base = faceProps({ ...die, overrides: {} }, index);
  const face = resolveFace(die, index);
  const set = (patch: Partial<FaceProps>) => {
    const next = { ...o, ...patch };
    (Object.keys(next) as (keyof FaceProps)[]).forEach((k) => next[k] === undefined && delete next[k]);
    onChange(index, Object.keys(next).length ? next : undefined);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="row">
          <FaceChip face={face} size={36} /> {t('die.face', { n: index })}
        </span>
      }
      wide
      footer={
        <>
          <button className="btn" onClick={() => onChange(index, undefined)}>
            <Icon name="undo" /> {t('die.resetFace')}
          </button>
          <span className="spacer" />
          <button className="btn primary" onClick={onClose}>
            <Icon name="check" /> OK
          </button>
        </>
      }
    >
      <div className="face-modal">
        <div className="stack">
          <div className="field">
            <span className="label">{t('die.value')}</span>
            <ValueEditor key={index} value={o.v ?? base.v} onChange={(v) => set({ v })} />
          </div>
        </div>
        <div className="stack">
          <div className="field">
            <span className="label">{t('die.bg')}</span>
            <ColorPicker value={o.bg} onChange={(bg) => set({ bg })} noneLabel={t('die.sameAsDie')} noneColor={base.bg} />
          </div>
          <div className="field">
            <span className="label">{t('die.fg')}</span>
            <ColorPicker value={o.fg} onChange={(fg) => set({ fg })} noneLabel={t('common.auto')} noneColor={base.fg ?? autoContrast(o.bg ?? base.bg)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- range row */

function RangeRow({ die, range, onChange, onRemove }: { die: Die; range: FaceRange; onChange: (r: FaceRange) => void; onRemove: () => void }) {
  const t = useT();
  const [open, setOpen] = useState<null | 'bg' | 'fg' | 'v'>(null);
  const sample = resolveFace({ ...die, overrides: {}, ranges: [range] }, range.from);
  return (
    <div className="range-row">
      <div className="range-main">
        <FaceChip face={sample} size={38} />
        <label className="range-num">
          <span>{t('die.from')}</span>
          <input className="input num" type="number" min={1} max={die.faces} value={range.from} onChange={(e) => onChange({ ...range, from: Number(e.target.value) || 1 })} />
        </label>
        <label className="range-num">
          <span>{t('die.to')}</span>
          <input className="input num" type="number" min={1} max={die.faces} value={range.to} onChange={(e) => onChange({ ...range, to: Number(e.target.value) || 1 })} />
        </label>
        <div className="range-props">
          <button type="button" className={`chip-btn ${open === 'bg' ? 'on' : ''}`} onClick={() => setOpen(open === 'bg' ? null : 'bg')}>
            <span className="dot" style={{ background: range.bg ?? 'transparent', borderStyle: range.bg ? 'solid' : 'dashed' }} /> {t('die.bg')}
          </button>
          <button type="button" className={`chip-btn ${open === 'fg' ? 'on' : ''}`} onClick={() => setOpen(open === 'fg' ? null : 'fg')}>
            <span className="dot" style={{ background: range.fg ?? 'transparent', borderStyle: range.fg ? 'solid' : 'dashed' }} /> {t('die.fg')}
          </button>
          <button type="button" className={`chip-btn ${open === 'v' ? 'on' : ''}`} onClick={() => setOpen(open === 'v' ? null : 'v')}>
            {range.v ? ('t' in range.v ? range.v.t : <GameIcon name={range.v.i} size={16} />) : '—'} {t('die.value')}
          </button>
        </div>
        <button type="button" className="btn sm icon danger" onClick={onRemove} aria-label={t('common.delete')}>
          <Icon name="trash" size={16} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="range-edit" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div style={{ padding: '10px 0' }}>
              {open === 'bg' && <ColorPicker value={range.bg} onChange={(bg) => onChange({ ...range, bg })} noneLabel={t('die.unchanged')} />}
              {open === 'fg' && <ColorPicker value={range.fg} onChange={(fg) => onChange({ ...range, fg })} noneLabel={t('common.auto')} />}
              {open === 'v' && <ValueEditor value={range.v} onChange={(v) => onChange({ ...range, v })} allowNone />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------------------------------------------- page */

export function DieEditor({ id }: { id: string }) {
  const t = useT();
  const name = useName();
  const lang = useLang();
  const [, navigate] = useLocation();
  const [params] = useSearchParams();
  const returnSet = params.get('set');
  const returnPlay = params.get('play') === '1';
  const stored = useLibrary((s) => (id === 'new' ? undefined : s.dice[id]));
  const sets = useLibrary((s) => s.sets);
  const { saveDie, deleteDie, duplicateDie } = useLibrary.getState();

  const [draft, setDraft] = useState<Die | null>(() =>
    id === 'new' ? blankDie({ name: lang === 'es' ? 'Dado nuevo' : 'New die' }) : stored ? structuredClone(stored) : null,
  );
  const [windowStart, setWindowStart] = useState(1);
  const [faceIdx, setFaceIdx] = useState<number | null>(null);
  const [spin, setSpin] = useState(true);
  const [focusSlot, setFocusSlot] = useState<number | null>(null);

  useEffect(() => {
    if (id !== 'new' && stored && draft?.id !== stored.id) setDraft(structuredClone(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const mapping = useMemo(() => (draft ? windowMapping(draft.faces, windowStart) : [1]), [draft, windowStart]);

  if (!draft)
    return (
      <div className="page">
        <div className="empty">
          <p>{t('die.notFound')}</p>
          <Link href="/dice" className="btn">
            <Icon name="back" /> {t('common.back')}
          </Link>
        </div>
      </div>
    );

  const update = (patch: Partial<Die>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const m = slotsFor(draft.faces);
  const impossible = isImpossible(draft.faces);
  const used = stored ? setsUsingDie(sets, stored.id).length : 0;
  const solidName = t(`solid.${solidFor(draft.faces)}`);
  const numberingPreview = [1, 2, 3].filter((i) => i <= draft.faces).map((i) => ('t' in defaultValue(draft, i) ? (defaultValue(draft, i) as { t: string }).t : '')).join(', ') + (draft.faces > 3 ? ` … ${formatNumber(draft.start + (draft.faces - 1) * draft.step)}` : '');

  const setFaces = (n: number) => {
    const faces = Math.max(2, Math.min(MAX_FACES, Math.round(n) || 2));
    update({ faces });
    setWindowStart(1);
  };

  const goBack = () => {
    if (returnPlay && returnSet) navigate(`/play/${returnSet}`);
    else if (returnSet) navigate(`/sets/${returnSet}`);
    else navigate('/dice');
  };

  const save = () => {
    const clean = { ...draft, name: draft.name.trim() || (lang === 'es' ? 'Dado' : 'Die') };
    saveDie(clean);
    if (id === 'new' && returnSet) {
      toast(t('die.savedAndAdded'));
      if (returnPlay) {
        addToTable(clean.id);
        navigate(`/play/${returnSet}`);
      } else navigate(`/sets/${returnSet}?added=${clean.id}`);
      return;
    }
    toast(t('common.saved'));
    goBack();
  };

  const faceList = Array.from({ length: Math.min(draft.faces, MAX_FACES) }, (_, i) => i + 1);

  return (
    <div className="page editor">
      <div className="page-head">
        <div className="row">
          <button className="btn icon" onClick={goBack} aria-label={t('common.back')}>
            <Icon name="back" />
          </button>
          <h1>{id === 'new' ? t('die.newTitle') : t('die.editTitle')}</h1>
        </div>
        <div className="row">
          {stored && (
            <>
              <button
                className="btn"
                onClick={() => {
                  const c = duplicateDie(stored.id, lang, t('lib.copySuffix'));
                  if (c) navigate(`/dice/${c.id}`);
                }}
              >
                <Icon name="copy" /> {t('common.duplicate')}
              </button>
              <button
                className="btn danger icon"
                aria-label={t('common.delete')}
                onClick={async () => {
                  const body = used ? t('lib.deleteUsed', { n: used }) : t('common.confirmDelete', { name: name(stored) });
                  if (await confirmDialog({ title: t('common.delete'), body, danger: true, confirm: t('common.delete') })) {
                    deleteDie(stored.id);
                    navigate('/dice');
                  }
                }}
              >
                <Icon name="trash" />
              </button>
            </>
          )}
          <button className="btn primary" onClick={save}>
            <Icon name="check" /> {t('common.save')}
          </button>
        </div>
      </div>

      <div className="editor-grid">
        <aside className="editor-preview">
          <div className="preview-stage">
            <DiePreview die={draft} mapping={mapping} spin={spin} focusSlot={focusSlot} />
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <label className="check small">
              <input type="checkbox" checked={spin} onChange={(e) => setSpin(e.target.checked)} /> {t('die.autoRotate')}
            </label>
          </div>
          {impossible && (
            <div className="field" style={{ padding: '0 8px' }}>
              <span className="label">{t('die.window', { from: windowStart, to: windowStart + m - 1 })}</span>
              <input type="range" min={1} max={draft.faces - m + 1} value={windowStart} onChange={(e) => setWindowStart(Number(e.target.value))} />
            </div>
          )}
        </aside>

        <div className="editor-form">
          {used > 0 && <div className="callout warn" style={{ marginBottom: 16 }}>{t('die.usedWarning', { n: used })}</div>}

          <section className="panel">
            <div className="field">
              <label htmlFor="die-name">{t('common.name')}</label>
              <input id="die-name" className="input big" value={name(draft)} placeholder={t('die.namePlaceholder')} onChange={(e) => update({ name: e.target.value, names: undefined })} maxLength={60} />
            </div>
          </section>

          <section className="panel">
            <h2>
              <Icon name="cube" /> {t('die.faces')}
            </h2>
            <div className="row">
              <div className="stepper">
                <button type="button" onClick={() => setFaces(draft.faces - 1)} aria-label="-">
                  −
                </button>
                <input type="number" min={2} max={MAX_FACES} value={draft.faces} onChange={(e) => setFaces(Number(e.target.value))} aria-label={t('die.faces')} />
                <button type="button" onClick={() => setFaces(draft.faces + 1)} aria-label="+">
                  +
                </button>
              </div>
              <div className="chips">
                {QUICK.map((n) => (
                  <button key={n} type="button" className={`chip-btn ${draft.faces === n ? 'on' : ''}`} onClick={() => setFaces(n)}>
                    {n === 2 ? t('die.coin') : `d${n}`}
                  </button>
                ))}
              </div>
            </div>
            <AnimatePresence>
              {impossible && (
                <motion.div className="callout" style={{ marginTop: 14 }} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Icon name="info" size={22} />
                  <div>
                    <strong>{t('die.impossibleTitle', { n: draft.faces, solid: solidName })}</strong>
                    {t('die.impossibleBody', { n: draft.faces, m, solid: solidName })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="panel">
            <h2>
              <Icon name="palette" /> {t('die.appearance')}
            </h2>
            <div className="stack">
              <div className="field">
                <span className="label">{t('die.color')}</span>
                <ColorPicker value={draft.color} onChange={(c) => c && update({ color: c })} />
              </div>
              <div className="field">
                <span className="label">{t('die.material')}</span>
                <div className="materials">
                  {MATERIALS.map((mt) => (
                    <button key={mt} type="button" className={`material ${draft.material === mt ? 'on' : ''}`} onClick={() => update({ material: mt })}>
                      <span className="material-ball" style={{ background: MAT_SWATCH[mt] }} />
                      {t(`mat.${mt}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>
              <Icon name="hash" /> {t('die.numbering')}
            </h2>
            <div className="row">
              <label className="field">
                <span className="label">{t('die.start')}</span>
                <input className="input num" type="number" value={draft.start} onChange={(e) => update({ start: Number(e.target.value) || 0 })} />
              </label>
              <label className="field">
                <span className="label">{t('die.step')}</span>
                <input className="input num" type="number" value={draft.step} onChange={(e) => update({ step: Number(e.target.value) || 0 })} />
              </label>
            </div>
            <p className="muted small" style={{ marginBottom: 0 }}>
              {t('die.numberingHint', { preview: numberingPreview })}
            </p>
          </section>

          <section className="panel">
            <h2>
              <Icon name="layers" /> {t('die.ranges')}
            </h2>
            <p className="hint">{t('die.rangesHint')}</p>
            <div className="stack">
              {draft.ranges.map((r, i) => (
                <RangeRow
                  key={i}
                  die={draft}
                  range={r}
                  onChange={(nr) => update({ ranges: draft.ranges.map((x, j) => (j === i ? nr : x)) })}
                  onRemove={() => update({ ranges: draft.ranges.filter((_, j) => j !== i) })}
                />
              ))}
              <button
                type="button"
                className="btn"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => update({ ranges: [...draft.ranges, { from: 1, to: Math.min(draft.faces, 3), bg: contrastingAccent(draft.color) }] })}
              >
                <Icon name="plus" /> {t('die.addRange')}
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>
              <Icon name="grid" /> {t('die.faceList')}
            </h2>
            <p className="hint">{t('die.faceListHint')}</p>
            <div className="face-grid">
              {faceList.map((i) => (
                <div key={i} className="face-cell">
                  <FaceChip
                    face={resolveFace(draft, i)}
                    size={52}
                    onClick={() => {
                      setFaceIdx(i);
                      const slot = mapping.indexOf(i);
                      if (slot >= 0) setFocusSlot(slot);
                    }}
                    title={t('die.face', { n: i })}
                  >
                    {draft.overrides[i] && <span className="chip-badge alt">✎</span>}
                  </FaceChip>
                  <span className="face-idx">{i}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <FaceModal
        die={draft}
        index={faceIdx}
        onClose={() => setFaceIdx(null)}
        onChange={(i, p) => {
          const overrides = { ...draft.overrides };
          if (p) overrides[i] = p;
          else delete overrides[i];
          update({ overrides });
        }}
      />
    </div>
  );
}
