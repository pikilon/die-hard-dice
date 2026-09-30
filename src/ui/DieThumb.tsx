import { useEffect, useState } from 'react';
import type { Die } from '../model/types';
import { onIconsLoaded } from '../three/icons';
import { cachedThumb, dieThumbnail } from '../three/thumbnails';

export function DieThumb({ die, size = 64, className = '' }: { die: Die; size?: number; className?: string }) {
  const [url, setUrl] = useState<string | undefined>(() => cachedThumb(die));
  const [tick, setTick] = useState(0);
  useEffect(() => onIconsLoaded(() => setTick((x) => x + 1)), []);
  useEffect(() => {
    let alive = true;
    const hit = cachedThumb(die);
    if (hit) setUrl(hit);
    else dieThumbnail(die).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [die, tick]);
  return (
    <span className={`die-thumb ${className}`} style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" width={size} height={size} draggable={false} /> : <span className="die-thumb-ph" />}
    </span>
  );
}
