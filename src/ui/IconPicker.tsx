import { useEffect, useMemo, useState } from 'react';
import { useT, type I18nKey } from '../i18n';
import { allIconNames, CORE_CATEGORIES, loadAllIcons, onIconsLoaded } from '../three/icons';
import { GameIcon } from './FaceChip';
import { Icon } from './Icon';

const MAX_SHOWN = 240;

export function IconPicker({ value, onPick }: { value?: string; onPick: (name: string) => void }) {
  const t = useT();
  const cats = Object.keys(CORE_CATEGORIES);
  const [cat, setCat] = useState<string>(cats[0]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [, force] = useState(0);
  useEffect(() => onIconsLoaded(() => force((x) => x + 1)), []);

  const names = useMemo(() => {
    const qq = q.trim().toLowerCase().replace(/\s+/g, '-');
    if (qq) return allIconNames().filter((n) => n.includes(qq));
    if (cat === '*') return allIconNames();
    return CORE_CATEGORIES[cat] ?? [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cat, loading]);

  const loadAll = () => {
    setLoading(true);
    loadAllIcons()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (q.trim().length >= 2) loadAll();
  }, [q]);

  return (
    <div className="icon-picker">
      <div className="search">
        <Icon name="search" size={18} />
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('icons.search')} />
      </div>
      {!q && (
        <div className="chips" style={{ margin: '10px 0' }}>
          {cats.map((c) => (
            <button key={c} type="button" className={`chip-btn ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
              {t(`icons.cat.${c}` as I18nKey)}
            </button>
          ))}
          <button
            type="button"
            className={`chip-btn ${cat === '*' ? 'on' : ''}`}
            onClick={() => {
              setCat('*');
              loadAll();
            }}
          >
            {t('icons.loadAll')}
          </button>
        </div>
      )}
      {loading && <div className="muted small">{t('icons.loading')}</div>}
      <div className="icon-grid">
        {names.slice(0, MAX_SHOWN).map((n) => (
          <button key={n} type="button" className={`icon-cell ${value === n ? 'on' : ''}`} onClick={() => onPick(n)} title={n}>
            <GameIcon name={n} size={30} />
          </button>
        ))}
        {names.length === 0 && !loading && <div className="muted small">{t('icons.noResults')}</div>}
      </div>
      {names.length > MAX_SHOWN && <div className="muted small">+{names.length - MAX_SHOWN}…</div>}
    </div>
  );
}
