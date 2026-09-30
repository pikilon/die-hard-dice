import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'wouter';
import { backgroundUrl } from '../data/backgrounds';
import { useLang, useName, useT } from '../i18n';
import type { DiceSet, Die } from '../model/types';
import { decodeShare } from '../share/codec';
import { applyImport, planImport, type ImportPlan, type PlanItem } from '../share/importPlan';
import { useLibrary } from '../store/library';
import { cssUrl } from '../ui/css';
import { DieThumb } from '../ui/DieThumb';
import { toast } from '../ui/feedback';
import { Icon } from '../ui/Icon';

function ItemRow<T extends Die | DiceSet>({ item, onChange, thumb }: { item: PlanItem<T>; onChange: (p: PlanItem<T>) => void; thumb: ReactNode }) {
  const t = useT();
  const name = useName();
  return (
    <div className={`import-row ${item.status}`}>
      {thumb}
      <div className="import-info">
        <strong>{name(item.incoming)}</strong>
        <span className={`badge ${item.status === 'conflict' ? 'gold' : ''}`}>
          {item.status === 'new' ? t('import.new') : item.status === 'same' ? t('import.same') : t('import.conflict')}
        </span>
      </div>
      {item.status === 'conflict' && (
        <div className="import-choice">
          <div className="segmented">
            <button className={item.choice === 'overwrite' ? 'on' : ''} onClick={() => onChange({ ...item, choice: 'overwrite' })}>
              {t('import.overwrite')}
            </button>
            <button className={item.choice === 'rename' ? 'on' : ''} onClick={() => onChange({ ...item, choice: 'rename' })}>
              {t('import.rename')}
            </button>
          </div>
          {item.choice === 'rename' && <input className="input" value={item.newName} onChange={(e) => onChange({ ...item, newName: e.target.value })} maxLength={60} />}
        </div>
      )}
    </div>
  );
}

export function Import() {
  const t = useT();
  const name = useName();
  const lang = useLang();
  const [, navigate] = useLocation();
  const [params] = useSearchParams();
  const payload = params.get('d') ?? '';
  const localDice = useLibrary((s) => s.dice);
  const localSets = useLibrary((s) => s.sets);

  const decoded = useMemo(() => {
    try {
      return decodeShare(payload);
    } catch {
      return null;
    }
  }, [payload]);

  const [plan, setPlan] = useState<ImportPlan | null>(() =>
    decoded ? planImport(decoded.set, decoded.dice, Object.values(localDice), Object.values(localSets), lang) : null,
  );

  if (!decoded || !plan)
    return (
      <div className="page">
        <div className="panel empty">
          <h2>{t('import.title')}</h2>
          <p>{t('import.invalid')}</p>
          <Link href="/" className="btn">
            <Icon name="back" /> {t('common.back')}
          </Link>
        </div>
      </div>
    );

  const doImport = () => {
    const res = applyImport(plan);
    const lib = useLibrary.getState();
    res.dice.forEach((d) => lib.saveDie(d));
    if (res.set) lib.saveSet(res.set);
    toast(t('import.done'));
    navigate(`/play/${res.setId}`, { replace: true });
  };

  return (
    <div className="page import">
      <div className="page-head">
        <div>
          <h1>{t('import.title')}</h1>
          <p>{t('import.subtitle')}</p>
        </div>
      </div>
      <div className="import-hero card" style={{ backgroundImage: cssUrl(backgroundUrl(decoded.set.background)) }}>
        <div className="import-hero-inner">
          <h2>{name(decoded.set)}</h2>
          <div className="row">
            {decoded.set.dice.map((id, i) => {
              const d = decoded.dice.find((x) => x.id === id);
              return d ? <DieThumb key={i} die={d} size={56} /> : null;
            })}
          </div>
        </div>
      </div>
      <section className="panel">
        <h2>{t('import.setTitle')}</h2>
        <ItemRow item={plan.set} onChange={(s) => setPlan({ ...plan, set: s })} thumb={<span className="import-bg" style={{ backgroundImage: cssUrl(backgroundUrl(decoded.set.background)) }} />} />
      </section>
      <section className="panel">
        <h2>{t('import.diceTitle')}</h2>
        <div className="stack">
          {plan.dice.map((p, i) => (
            <ItemRow key={p.incoming.id} item={p} thumb={<DieThumb die={p.incoming} size={48} />} onChange={(np) => setPlan({ ...plan, dice: plan.dice.map((x, j) => (j === i ? np : x)) })} />
          ))}
        </div>
      </section>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
        <Link href="/" className="btn">
          {t('common.cancel')}
        </Link>
        <button className="btn primary" onClick={doImport}>
          <Icon name="check" /> {t('import.do')}
        </button>
      </div>
    </div>
  );
}
