import { useEffect, useMemo, useState } from 'react';
import type { Die } from '../model/types';
import { onIconsLoaded } from './icons';
import { acquireDieMaterial, dieVisualKey, releaseDieMaterial } from './materials';

/** Shared material for a die showing `mapping` (slot → logical face). */
export function useDieMaterial(die: Die, mapping: number[]) {
  const [tick, setTick] = useState(0);
  useEffect(() => onIconsLoaded(() => setTick((x) => x + 1)), []);
  const visual = dieVisualKey(die);
  const mapKey = mapping.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const acquired = useMemo(() => acquireDieMaterial(die, mapping), [visual, mapKey, tick]);
  useEffect(() => () => releaseDieMaterial(acquired.key), [acquired.key]);
  return acquired.material;
}
