import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { graphemes } from '../model/faces';
import type { ResolvedFace } from '../model/types';
import { iconPathData, onIconsLoaded } from '../three/icons';

export function GameIcon({ name, size = 24, color = 'currentColor', title }: { name: string; size?: number | string; color?: string; title?: string }) {
  const [, force] = useState(0);
  const d = iconPathData(name);
  useEffect(() => (d ? undefined : onIconsLoaded(() => force((x) => x + 1))), [d]);
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {d ? <path d={d} fill={color} /> : <circle cx="256" cy="256" r="90" fill={color} opacity="0.3" />}
    </svg>
  );
}

interface Props {
  face: ResolvedFace;
  size?: number;
  selected?: boolean;
  onClick?: (e: MouseEvent) => void;
  onContextMenu?: (e: MouseEvent) => void;
  title?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** 2D rendering of a die face: colored tile + value (text, emoji or icon). */
export function FaceChip({ face, size = 40, selected, onClick, onContextMenu, title, className = '', style, children }: Props) {
  const len = 't' in face.value ? graphemes(face.value.t).length : 1;
  const cls = `face-chip ${len === 2 ? 'len2' : len >= 3 ? 'len3' : ''} ${selected ? 'selected' : ''} ${className}`;
  const content = 'i' in face.value ? <GameIcon name={face.value.i} color={face.fg} size="74%" /> : face.value.t;
  const st = { '--size': `${size}px`, background: face.bg, color: face.fg, ...style } as CSSProperties;
  if (onClick || onContextMenu)
    return (
      <button type="button" className={cls} style={st} onClick={onClick} onContextMenu={onContextMenu} title={title}>
        {content}
        {children}
      </button>
    );
  return (
    <span className={cls} style={st} title={title}>
      {content}
      {children}
    </span>
  );
}
