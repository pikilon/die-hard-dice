import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useLang, useT } from '../../i18n';
import { resolveFace } from '../../model/faces';
import { computeTally } from '../../model/tally';
import type { DieResult, RollEntry, TallyOptions } from '../../model/types';
import { useHistory } from '../../store/history';
import { FaceChip } from '../../ui/FaceChip';
import { confirmDialog } from '../../ui/feedback';
import { Icon } from '../../ui/Icon';

function ResultLine({ entry, results, tally }: { entry: RollEntry; results: DieResult[]; tally: TallyOptions }) {
  const items = results.filter((r) => entry.dice[r.dieId]).map((r) => ({ uid: r.uid, die: entry.dice[r.dieId], face: r.face }));
  const sum = computeTally(items, tally);
  return (
    <div className="hist-line">
      <div className="hist-chips">
        {results.map((r) => {
          const die = entry.dice[r.dieId];
          if (!die) return null;
          return (
            <span key={r.uid} className="hist-chip">
              {r.original != null && <FaceChip face={resolveFace(die, r.original)} size={22} className="struck" />}
              {r.original != null && <span className="arrow">→</span>}
              <FaceChip face={resolveFace(die, r.face)} size={28} />
            </span>
          );
        })}
      </div>
      {tally.sum && sum.hasNumbers && <span className="hist-sum">Σ {sum.sum}</span>}
    </div>
  );
}

export function HistoryPanel({ open, onClose, setId, tally }: { open: boolean; onClose: () => void; setId: string; tally: TallyOptions }) {
  const t = useT();
  const lang = useLang();
  const entries = useHistory((s) => s.entries);
  const clear = useHistory((s) => s.clear);
  const [onlyThis, setOnlyThis] = useState(true);
  const list = useMemo(() => (onlyThis ? entries.filter((e) => e.setId === setId) : entries), [entries, onlyThis, setId]);
  const fmt = useMemo(() => new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' }), [lang]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="history"
          initial={{ x: '105%' }}
          animate={{ x: 0 }}
          exit={{ x: '105%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        >
          <div className="history-head">
            <h2>
              <Icon name="history" /> {t('hist.title')}
            </h2>
            <button className="btn ghost icon" onClick={onClose} aria-label={t('common.close')}>
              <Icon name="close" />
            </button>
          </div>
          <label className="check small">
            <input type="checkbox" checked={onlyThis} onChange={(e) => setOnlyThis(e.target.checked)} />
            {t('hist.onlyThisSet')}
          </label>
          <div className="history-list">
            {list.length === 0 && <div className="empty">{t('hist.empty')}</div>}
            <AnimatePresence initial={false}>
              {list.map((e) => (
                <motion.div key={e.id} className="hist-entry" layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <div className="hist-meta">
                    <span>{fmt.format(e.at)}</span>
                    {!onlyThis && <span className="badge">{e.setName}</span>}
                  </div>
                  <ResultLine entry={e} results={e.results} tally={tally} />
                  {e.rerolls.map((rr, i) => (
                    <div key={i} className="hist-reroll">
                      <span className="hist-reroll-label">↻ {t('hist.reroll')}</span>
                      <ResultLine entry={e} results={rr.results} tally={tally} />
                    </div>
                  ))}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {list.length > 0 && (
            <button
              className="btn sm danger"
              onClick={async () => {
                if (await confirmDialog({ title: t('hist.clear'), body: t('hist.clearConfirm'), danger: true, confirm: t('common.delete') }))
                  clear(onlyThis ? setId : undefined);
              }}
            >
              <Icon name="trash" size={16} /> {t('hist.clear')}
            </button>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
