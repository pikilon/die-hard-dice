import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useLang, useName, useT } from '../i18n';
import { isImpossible, solidFor } from '../model/solids';
import { setsUsingDie, useLibrary } from '../store/library';
import { DieThumb } from '../ui/DieThumb';
import { confirmDialog } from '../ui/feedback';
import { Icon } from '../ui/Icon';

export function Library() {
  const t = useT();
  const name = useName();
  const lang = useLang();
  const [, navigate] = useLocation();
  const dice = useLibrary((s) => s.dice);
  const order = useLibrary((s) => s.diceOrder);
  const sets = useLibrary((s) => s.sets);
  const { duplicateDie, deleteDie } = useLibrary.getState();
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return order.map((id) => dice[id]).filter((d) => d && (!qq || name(d).toLowerCase().includes(qq) || `d${d.faces}` === qq));
  }, [order, dice, q, name]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t('lib.title')}</h1>
          <p>{t('lib.subtitle')}</p>
        </div>
        <div className="row">
          <div className="search">
            <Icon name="search" size={18} />
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} />
          </div>
          <Link href="/dice/new" className="btn primary">
            <Icon name="plus" /> {t('lib.newDie')}
          </Link>
        </div>
      </div>
      <div className="dice-grid">
        {list.map((d, i) => {
          const used = setsUsingDie(sets, d.id).length;
          return (
            <motion.article
              key={d.id}
              className="card die-card"
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.03, 0.35) }}
            >
              <Link href={`/dice/${d.id}`} className="die-card-thumb" aria-label={`${t('common.edit')}: ${name(d)}`}>
                <DieThumb die={d} size={112} />
              </Link>
              <div className="die-card-body">
                <h3 title={name(d)}>{name(d)}</h3>
                <div className="row" style={{ gap: 6 }}>
                  <span className="badge gold">d{d.faces}</span>
                  {isImpossible(d.faces) && <span className="badge">{t('lib.shownAs', { solid: t(`solid.${solidFor(d.faces)}`) })}</span>}
                  <span className="badge">{used === 0 ? t('lib.unused') : used === 1 ? t('lib.usedIn1') : t('lib.usedIn', { n: used })}</span>
                </div>
                <div className="row" style={{ gap: 6, marginTop: 8 }}>
                  <Link href={`/dice/${d.id}`} className="btn sm">
                    <Icon name="edit" size={16} /> {t('common.edit')}
                  </Link>
                  <button
                    className="btn sm icon"
                    title={t('common.duplicate')}
                    aria-label={t('common.duplicate')}
                    onClick={() => {
                      const c = duplicateDie(d.id, lang, t('lib.copySuffix'));
                      if (c) navigate(`/dice/${c.id}`);
                    }}
                  >
                    <Icon name="copy" size={16} />
                  </button>
                  <button
                    className="btn sm icon danger"
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                    onClick={async () => {
                      const body = used ? t('lib.deleteUsed', { n: used }) : t('common.confirmDelete', { name: name(d) });
                      if (await confirmDialog({ title: t('common.delete'), body, danger: true, confirm: t('common.delete') })) deleteDie(d.id);
                    }}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
      {list.length === 0 && <div className="empty">{t('lib.empty')}</div>}
    </div>
  );
}
