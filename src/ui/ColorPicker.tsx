import { useT } from '../i18n';

export const PALETTE = [
  '#f4f1ea', '#f3ead7', '#d9d9d9', '#8a8f98', '#2b2b30', '#141414',
  '#c92a2a', '#e8590c', '#f59f00', '#f2c14e', '#2f9e44', '#0ca678',
  '#1098ad', '#1c7ed6', '#3b5bdb', '#7048e8', '#46206b', '#ae3ec9',
  '#e64980', '#8d5524', '#5c3d2e', '#d4a73a',
];

interface Props {
  value: string | undefined;
  onChange: (c: string | undefined) => void;
  /** Label for the "no value" option (e.g. "Automatic", "Same as die"). */
  noneLabel?: string;
  noneColor?: string;
}

export function ColorPicker({ value, onChange, noneLabel, noneColor }: Props) {
  const t = useT();
  const v = value?.toLowerCase();
  return (
    <div className="swatches">
      {noneLabel && (
        <button
          type="button"
          className={`chip-btn ${!value ? 'on' : ''}`}
          onClick={() => onChange(undefined)}
          style={{ height: 30, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {noneColor && <span className="swatch" style={{ width: 16, height: 16, background: noneColor, borderWidth: 1 }} />}
          {noneLabel}
        </button>
      )}
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          className={`swatch ${v === c ? 'on' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={c}
          title={c}
        />
      ))}
      <label className={`swatch custom ${value && !PALETTE.includes(v!) ? 'on' : ''}`} title={t('common.edit')}>
        <input type="color" value={value ?? noneColor ?? '#ffffff'} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
