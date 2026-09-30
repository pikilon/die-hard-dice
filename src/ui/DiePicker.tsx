import { useMemo, useState } from 'react';
import { useName, useT } from '../i18n';
import { slotsFor, solidFor } from '../model/solids';
import { useLibrary } from '../store/library';
import { DieThumb } from './DieThumb';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (dieId: string) => void;
  onCreate?: () => void;
}

export function DiePicker({ open, onClose, onPick, onCreate }: Props) {
  const t = useT();
  const name = useName();
  const dice = useLibrary((s) => s.dice);
  const order = useLibrary((s) => s.diceOrder);
  const [q, setQ] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return order.map((id) => dice[id]).filter((d) => d && (!qq || name(d).toLowerCase().includes(qq) || `d${d.faces}`.includes(qq)));
  }, [dice, order, q, name]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('picker.title')}
      wide
      footer={
        <>
          {onCreate && (
            <button className="btn" onClick={onCreate}>
              <Icon name="plus" /> {t('set.newDie')}
            </button>
          )}
          <span className="spacer" />
          <button className="btn primary" onClick={onClose}>
            <Icon name="check" /> {t('common.close')}
          </button>
        </>
      }
    >
      <p className="muted small" style={{ marginTop: -6 }}>
        {t('picker.hint')}
      </p>
      <div className="search">
        <Icon name="search" size={18} />
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} autoFocus />
      </div>
      <div className="picker-grid">
        {list.map((d) => (
          <button
            key={d.id}
            className={`picker-item ${flash === d.id ? 'flash' : ''}`}
            onClick={() => {
              onPick(d.id);
              setFlash(d.id);
              setTimeout(() => setFlash((f) => (f === d.id ? null : f)), 500);
            }}
          >
            <DieThumb die={d} size={72} />
            <span className="picker-name">{name(d)}</span>
            <span className="badge">
              d{d.faces}
              {slotsFor(d.faces) !== d.faces && ` · ${t(`solid.${solidFor(d.faces)}`)}`}
            </span>
          </button>
        ))}
        {list.length === 0 && <div className="empty">{t('lib.empty')}</div>}
      </div>
    </Modal>
  );
}
