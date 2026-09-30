import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { BUILTIN_DICE, BUILTIN_SETS } from '../data/presets';
import { getSolid, slotDirection, topSlot } from '../three/solids';
import { autoContrast, BLACK, WHITE } from './color';
import { clampText, parseNumeric, resolveFace } from './faces';
import type { Rng } from './ids';
import { uniqueName } from './names';
import { isImpossible, placeFace, randomMapping, slotsFor, solidFor, windowMapping } from './solids';
import { computeTally } from './tally';
import type { Die, SolidId } from './types';

const die = (p: Partial<Die>): Die => ({
  id: 'x', name: 'x', faces: 6, color: '#ffffff', material: 'plastic', start: 1, step: 1, ranges: [], overrides: {}, updatedAt: 0, ...p,
});

function seeded(seed: number): Rng {
  let s = seed >>> 0;
  return (n) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return Math.floor((s / 4294967296) * n);
  };
}

describe('solid selection', () => {
  it('uses the biggest solid with at most N faces', () => {
    const cases: [number, SolidId][] = [[2, 'd2'], [3, 'd2'], [4, 'd4'], [5, 'd4'], [6, 'd6'], [7, 'd6'], [8, 'd8'], [9, 'd8'], [10, 'd10'], [11, 'd10'], [12, 'd12'], [19, 'd12'], [20, 'd20'], [100, 'd20']];
    for (const [n, s] of cases) expect(solidFor(n), `N=${n}`).toBe(s);
    expect(isImpossible(7)).toBe(true);
    expect(isImpossible(20)).toBe(false);
  });

  it('window mapping clamps to the valid range', () => {
    expect(windowMapping(7, 1)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(windowMapping(7, 9)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(windowMapping(3, 2)).toEqual([2, 3]);
  });
});

describe('random slices are fair', () => {
  it.each([3, 7, 13, 30])('N=%i → every face ≈ 1/N', (n) => {
    const rng = seeded(n * 7919);
    const m = slotsFor(n);
    const counts = new Array(n + 1).fill(0);
    const trials = 10000 * n;
    for (let t = 0; t < trials; t++) {
      const mapping = randomMapping(n, rng);
      expect(new Set(mapping).size).toBe(m);
      counts[mapping[rng(m)]]++; // physics picks a slot uniformly
    }
    for (let f = 1; f <= n; f++) expect(Math.abs(counts[f] / trials - 1 / n)).toBeLessThan(0.01);
  });

  it('placeFace swaps or replaces', () => {
    expect(placeFace([1, 2, 3], 0, 3)).toEqual([3, 2, 1]);
    expect(placeFace([1, 2, 3], 1, 7)).toEqual([1, 7, 3]);
  });
});

describe('solid geometry', () => {
  const expected: Record<SolidId, number> = { d2: 38, d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
  it.each(Object.keys(expected) as SolidId[])('%s has the right faces and slots', (id) => {
    const s = getSolid(id);
    expect(s.faces.length).toBe(expected[id]);
    if (id !== 'd4') {
      const slots = s.slotOfFace.filter((x) => x >= 0).sort((a, b) => a - b);
      expect(slots).toEqual(Array.from({ length: s.slots }, (_, i) => i));
    }
  });

  it.each(['d6', 'd8', 'd10', 'd12', 'd20'] as SolidId[])('%s opposite faces sum to N+1', (id) => {
    const s = getSolid(id);
    s.faces.forEach((_, f) => {
      const opp = s.normals.findIndex((n) => n.dot(s.normals[f]) < -0.999);
      expect(opp).toBeGreaterThanOrEqual(0);
      expect(s.slotOfFace[f] + s.slotOfFace[opp]).toBe(s.slots - 1);
    });
  });

  it.each(['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'] as SolidId[])('%s: rotating a slot up reads that slot', (id) => {
    const s = getSolid(id);
    for (let slot = 0; slot < s.slots; slot++) {
      const q = new Quaternion().setFromUnitVectors(slotDirection(s, slot), new Vector3(0, 1, 0));
      const { slot: read, alignment } = topSlot(s, (v) => v.applyQuaternion(q));
      expect(read).toBe(slot);
      expect(alignment).toBeGreaterThan(0.99);
    }
  });
});

describe('faces', () => {
  it('resolves numbering, ranges and overrides in order', () => {
    const d = die({
      faces: 8, start: 0, step: 5,
      ranges: [{ from: 3, to: 5, bg: '#ff0000', fg: '#00ff00' }, { from: 5, to: 6, v: { i: 'death-skull' } }],
      overrides: { 5: { v: { t: 'X' } } },
    });
    expect(resolveFace(d, 1).value).toEqual({ t: '0' });
    expect(resolveFace(d, 2).num).toBe(5);
    expect(resolveFace(d, 3)).toMatchObject({ bg: '#ff0000', fg: '#00ff00' });
    expect(resolveFace(d, 5).value).toEqual({ t: 'X' });
    expect(resolveFace(d, 6).value).toEqual({ i: 'death-skull' });
    expect(resolveFace(d, 6).num).toBeNull();
  });

  it('auto contrast picks black or white', () => {
    expect(autoContrast('#ffffff')).toBe(BLACK);
    expect(autoContrast('#000000')).toBe(WHITE);
    expect(autoContrast('#f2c14e')).toBe(BLACK);
    expect(autoContrast('#46206b')).toBe(WHITE);
  });

  it('limits text to 3 graphemes', () => {
    expect(clampText('12345')).toBe('123');
    expect(clampText('👨‍👩‍👧‍👦☠️🎲🐉')).toBe('👨‍👩‍👧‍👦☠️🎲');
    expect(parseNumeric({ t: '-3' })).toBe(-3);
    expect(parseNumeric({ t: '00' })).toBe(0);
    expect(parseNumeric({ t: 'A' })).toBeNull();
  });
});

describe('tally', () => {
  it('sums numbers and groups identical non-numbers', () => {
    const hq = BUILTIN_DICE.find((d) => d.builtin === 'hq-combat')!;
    const d6 = die({});
    const t = computeTally(
      [
        { uid: 'a', die: d6, face: 4 },
        { uid: 'b', die: d6, face: 2 },
        { uid: 'c', die: hq, face: 1 },
        { uid: 'd', die: hq, face: 2 },
        { uid: 'e', die: hq, face: 4 },
        { uid: 'f', die: hq, face: 6 },
      ],
      { sum: true, groupNumbers: false },
    );
    expect(t.sum).toBe(6);
    expect(t.groups.map((g) => g.count)).toEqual([2, 1, 1]); // 2 skulls, white shield, black shield
  });
});

describe('presets', () => {
  it('sets only reference existing dice', () => {
    const ids = new Set(BUILTIN_DICE.map((d) => d.id));
    for (const s of BUILTIN_SETS) for (const d of s.dice) expect(ids.has(d), `${s.id}→${d}`).toBe(true);
  });

  it('unique names', () => {
    expect(uniqueName('D6', ['d6', 'D6 (2)'])).toBe('D6 (3)');
    expect(uniqueName('Nuevo', ['D6'])).toBe('Nuevo');
  });
});
