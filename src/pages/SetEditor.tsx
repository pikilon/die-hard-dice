import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'wouter';
import { BACKGROUNDS, presetUrl } from '../data/backgrounds';
import { useLang, useName, useT } from '../i18n';
import { newId } from '../model/ids';
import { isImpossible, solidFor } from '../model/solids';
import type { DiceSet } from '../model/types';
import { blankSet, useLibrary } from '../store/library';
import { cssUrl } from '../ui/css';
import { DiePicker } from '../ui/DiePicker';
import { DieThumb } from '../ui/DieThumb';
import { confirmDialog, promptDialog, toast } from '../ui/feedback';
import { Icon } from '../ui/Icon';
import { ShareModal } from '../ui/ShareModal';

/** Unsaved drafts survive a trip to the die editor and back. */
const drafts = new Map<string, DiceSet>();

async function fileToDataUrl(file: File, max = 1600): Promise<string> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.84);
}

export function SetEditor({ id }: { id: string }) {
  const t = useT();
  const name = useName();
  const lang = useLang();
  const [, navigate] = useLocation();
  const [params, setParams] = useSearchParams();
  const stored = useLibrary((s) => (id === 'new' ? undefined : s.sets[id]));
  const dice = useLibrary((s) => s.dice);
  const { saveSet, deleteSet, duplicateDie } = useLibrary.getState();
  const [picker, setPicker] = useState(false);
  const [share, setShare] = useState(false);
  const [draft, setDraft] = useState<DiceSet | null>(() => {
    const cached = drafts.get(id);
    if (cached) return cached;
    if (id === 'new') return blankSet({ name: '' });
    return stored ? structuredClone(stored) : null;
  });
  const [bgUrl, setBgUrl] = useState(draft?.background.kind === 'url' ? draft.background.url : '');

  // keep the draft cached while editing
  useEffect(() => {
    if (draft) drafts.set(id, draft);
  }, [draft, id]);

  // coming back from "create new die"
  useEffect(() => {
    const added = params.get('added');
    if (!added || !draft) return;
    if (useLibrary.getState().dice[added]) setDraft({ ...draft, dice: [...draft.dice, added] });
    setParams((p) => {
      p.delete('added');
      return p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const groups = useMemo(() => {
    if (!draft) return [];
    const order: string[] = [];
    const counts = new Map<string, number>();
    for (const d of draft.dice) {
      if (!counts.has(d)) order.push(d);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return order.filter((d) => dice[d]).map((d) => ({ die: dice[d], count: counts.get(d)! }));
  }, [draft, dice]);

  if (!draft)
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

  const update = (patch: Partial<DiceSet>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const dirty = !stored || JSON.stringify({ ...stored, updatedAt: 0 }) !== JSON.stringify({ ...draft, updatedAt: 0 });

  const setCount = (dieId: string, n: number) => {
    const others = draft.dice.filter((d) => d !== dieId);
    const firstIdx = draft.dice.indexOf(dieId);
    const list = draft.dice.slice();
    if (n <= 0) return update({ dice: others });
    // keep position of the first occurrence, put copies together
    const before = list.slice(0, firstIdx).filter((d) => d !== dieId);
    const after = list.slice(firstIdx).filter((d) => d !== dieId);
    update({ dice: [...before, ...Array(n).fill(dieId), ...after] });
  };

  const persist = (): DiceSet | null => {
    if (!draft.name.trim() && !draft.names) {
      toast(t('set.needName'));
      return null;
    }
    const clean = { ...draft, name: draft.name.trim() || name(draft) };
    saveSet(clean);
    drafts.delete(id);
    toast(t('common.saved'));
    if (id === 'new') navigate(`/sets/${clean.id}`, { replace: true });
    return clean;
  };

  const leave = async (to: string) => {
    if (dirty && !(await confirmDialog({ title: t('common.back'), body: t('set.unsaved') }))) return;
    drafts.delete(id);
    navigate(to);
  };

  return (
    <div className="page editor">
      <div className="page-head">
        <div className="row">
          <button className="btn icon" onClick={() => leave('/')} aria-label={t('common.back')}>
            <Icon name="back" />
          </button>
          <h1>{id === 'new' ? t('set.newTitle') : t('set.editTitle')}</h1>
        </div>
        <div className="row">
          {stored && (
            <>
              <button className="btn icon" onClick={() => setShare(true)} title={t('common.share')} aria-label={t('common.share')}>
                <Icon name="share" />
              </button>
              <button
                className="btn"
                onClick={async () => {
                  const n = await promptDialog({ title: t('set.saveAsPrompt'), value: `${name(draft)} ${t('lib.copySuffix')}` });
                  if (!n) return;
                  const copy: DiceSet = { ...structuredClone(draft), id: newId(), name: n, updatedAt: Date.now() };
                  delete copy.names;
                  delete copy.builtin;
                  saveSet(copy);
                  drafts.delete(id);
                  toast(t('common.saved'));
                  navigate(`/sets/${copy.id}`);
                }}
              >
                <Icon name="copy" /> {t('set.saveAs')}
              </button>
              <button
                className="btn danger icon"
                aria-label={t('common.delete')}
                onClick={async () => {
                  if (await confirmDialog({ title: t('common.delete'), body: t('common.confirmDelete', { name: name(stored) }), danger: true, confirm: t('common.delete') })) {
                    deleteSet(stored.id);
                    drafts.delete(id);
                    navigate('/');
                  }
                }}
              >
                <Icon name="trash" />
              </button>
            </>
          )}
          <button className="btn primary" onClick={persist} disabled={!dirty && !!stored}>
            <Icon name="check" /> {t('common.save')}
          </button>
          <button
            className="btn"
            onClick={() => {
              const s = dirty ? persist() : draft;
              if (s) navigate(`/play/${s.id}`);
            }}
          >
            <Icon name="play" /> {t('common.play')}
          </button>
        </div>
      </div>

      <div className="set-editor">
        <section className="panel">
          <div className="stack">
            <div className="field">
              <label htmlFor="set-name">{t('common.name')}</label>
              <input id="set-name" className="input big" value={name(draft)} placeholder={t('set.namePlaceholder')} onChange={(e) => update({ name: e.target.value, names: undefined })} maxLength={60} />
            </div>
            <div className="field">
              <label htmlFor="set-desc">{t('set.description')}</label>
              <textarea id="set-desc" className="input" rows={2} value={draft.description ?? ''} onChange={(e) => update({ description: e.target.value || undefined })} maxLength={300} />
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>
            <Icon name="cube" /> {t('set.dice')}
          </h2>
          {groups.length === 0 && <div className="empty small">{t('set.noDice')}</div>}
          <div className="set-dice">
            {groups.map(({ die, count }) => (
              <motion.div key={die.id} className="set-die-row" layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <DieThumb die={die} size={54} />
                <div className="set-die-info">
                  <strong>{name(die)}</strong>
                  <span className="muted small">
                    d{die.faces}
                    {isImpossible(die.faces) && ` · ${t('lib.shownAs', { solid: t(`solid.${solidFor(die.faces)}`) })}`}
                  </span>
                </div>
                <div className="stepper small">
                  <button type="button" onClick={() => setCount(die.id, count - 1)} aria-label="-">
                    −
                  </button>
                  <input type="number" min={0} max={30} value={count} onChange={(e) => setCount(die.id, Math.min(30, Number(e.target.value) || 0))} />
                  <button type="button" onClick={() => setCount(die.id, Math.min(30, count + 1))} aria-label="+">
                    +
                  </button>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <Link href={`/dice/${die.id}?set=${id}`} className="btn sm icon" title={t('set.editDie')} aria-label={t('set.editDie')}>
                    <Icon name="edit" size={16} />
                  </Link>
                  <button
                    className="btn sm icon"
                    title={t('set.cloneDieHint')}
                    aria-label={t('set.cloneDie')}
                    onClick={() => {
                      const c = duplicateDie(die.id, lang, t('lib.copySuffix'));
                      if (!c) return;
                      update({ dice: draft.dice.map((d) => (d === die.id ? c.id : d)) });
                      navigate(`/dice/${c.id}?set=${id}`);
                    }}
                  >
                    <Icon name="copy" size={16} />
                  </button>
                  <button className="btn sm icon danger" title={t('set.remove')} aria-label={t('set.remove')} onClick={() => setCount(die.id, 0)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={() => setPicker(true)}>
              <Icon name="plus" /> {t('set.addDice')}
            </button>
            <button className="btn" onClick={() => navigate(`/dice/new?set=${id}`)}>
              <Icon name="sparkles" /> {t('set.newDie')}
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>
            <Icon name="image" /> {t('set.background')}
          </h2>
          <div className="bg-grid">
            {BACKGROUNDS.map((b) => {
              const on = draft.background.kind === 'preset' && draft.background.id === b.id;
              return (
                <button key={b.id} type="button" className={`bg-tile ${on ? 'on' : ''}`} style={{ backgroundImage: cssUrl(presetUrl(b.id)) }} onClick={() => update({ background: { kind: 'preset', id: b.id } })}>
                  <span>{b.names[lang]}</span>
                </button>
              );
            })}
            {draft.background.kind === 'upload' && (
              <button type="button" className="bg-tile on" style={{ backgroundImage: cssUrl(draft.background.dataUrl) }}>
                <span>{t('set.bgUpload')}</span>
              </button>
            )}
            {draft.background.kind === 'url' && (
              <button type="button" className="bg-tile on" style={{ backgroundImage: cssUrl(draft.background.url) }}>
                <span>URL</span>
              </button>
            )}
          </div>
          <div className="bg-custom">
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label htmlFor="bg-url">{t('set.bgUrl')}</label>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input id="bg-url" className="input" type="url" placeholder="https://…" value={bgUrl} onChange={(e) => setBgUrl(e.target.value)} />
                <button className="btn" disabled={!/^https?:\/\/\S+$/i.test(bgUrl)} onClick={() => update({ background: { kind: 'url', url: bgUrl.trim() } })}>
                  <Icon name="check" />
                </button>
              </div>
              <span className="muted small">{t('set.bgUrlHint')}</span>
            </div>
            <div className="field">
              <span className="label">{t('set.bgUpload')}</span>
              <label className="btn">
                <Icon name="upload" /> {t('set.bgUpload')}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const dataUrl = await fileToDataUrl(f);
                    update({ background: { kind: 'upload', dataUrl } });
                  }}
                />
              </label>
              <span className="muted small">{t('set.bgUploadHint')}</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>
            <Icon name="hash" /> {t('set.tally')}
          </h2>
          <label className="check">
            <input type="checkbox" checked={draft.tally.sum} onChange={(e) => update({ tally: { ...draft.tally, sum: e.target.checked } })} />
            {t('set.tallySum')}
          </label>
          <label className="check">
            <input type="checkbox" checked={draft.tally.groupNumbers} onChange={(e) => update({ tally: { ...draft.tally, groupNumbers: e.target.checked } })} />
            {t('set.tallyGroup')}
          </label>
        </section>
      </div>

      <DiePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(dieId) => {
          setDraft((d) => (d ? { ...d, dice: [...d.dice, dieId] } : d));
          toast(t('picker.added', { name: name(dice[dieId]) }));
        }}
        onCreate={() => {
          setPicker(false);
          navigate(`/dice/new?set=${id}`);
        }}
      />
      <ShareModal set={stored ?? null} open={share} onClose={() => setShare(false)} />
    </div>
  );
}
