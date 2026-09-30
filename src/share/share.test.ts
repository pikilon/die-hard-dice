import { describe, expect, it } from 'vitest';
import { BUILTIN_DICE, BUILTIN_SETS } from '../data/presets';
import type { DiceSet, Die } from '../model/types';
import { decodeShare, encodeShare } from './codec';
import { applyImport, planImport } from './importPlan';

const hqSet = BUILTIN_SETS.find((s) => s.builtin === 'hq-hero')!;
const diceOf = (s: DiceSet) => BUILTIN_DICE.filter((d) => s.dice.includes(d.id));

describe('share codec', () => {
  it('round-trips a set with its dice and stays small', () => {
    const { payload } = encodeShare(hqSet, diceOf(hqSet));
    expect(payload.length).toBeLessThan(1500);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    const out = decodeShare(payload);
    expect(out.set.dice).toEqual(hqSet.dice);
    expect(out.dice.map((d) => d.id).sort()).toEqual(diceOf(hqSet).map((d) => d.id).sort());
    const combat = out.dice.find((d) => d.builtin === 'hq-combat')!;
    expect(combat.ranges).toEqual(BUILTIN_DICE.find((d) => d.builtin === 'hq-combat')!.ranges);
  });

  it('drops uploaded backgrounds', () => {
    const s = { ...hqSet, background: { kind: 'upload' as const, dataUrl: 'data:image/png;base64,AAAA' } };
    const { payload, droppedUpload } = encodeShare(s, diceOf(s));
    expect(droppedUpload).toBe(true);
    expect(decodeShare(payload).set.background).toEqual({ kind: 'preset', id: 'felt' });
  });

  it('rejects garbage', () => {
    expect(() => decodeShare('not-a-payload')).toThrow();
  });
});

describe('import planning', () => {
  const localDice = BUILTIN_DICE.map((d) => structuredClone(d));
  const localSets = BUILTIN_SETS.map((s) => structuredClone(s));

  it('reuses identical items without asking', () => {
    const plan = planImport(hqSet, diceOf(hqSet), localDice, localSets, 'es');
    expect(plan.set.status).toBe('same');
    expect(plan.dice.every((p) => p.status === 'same')).toBe(true);
    const res = applyImport(plan);
    expect(res.dice).toHaveLength(0);
    expect(res.set).toBeNull();
    expect(res.setId).toBe(hqSet.id);
  });

  it('offers rename on name clash and relinks dice', () => {
    const custom: Die = { ...structuredClone(localDice[2]), id: 'abc123', name: 'D6', names: undefined, color: '#00ff00' };
    delete custom.names;
    delete custom.builtin;
    const set: DiceSet = { ...structuredClone(hqSet), id: 'set999', name: 'HeroQuest · Héroe', dice: ['abc123', 'abc123'] };
    delete set.names;
    delete set.builtin;
    const plan = planImport(set, [custom], localDice, localSets, 'es');
    expect(plan.dice[0].status).toBe('conflict');
    expect(plan.dice[0].newName).toBe('D6 (2)');
    expect(plan.set.status).toBe('conflict');
    const res = applyImport(plan);
    expect(res.dice[0].name).toBe('D6 (2)');
    expect(res.dice[0].id).not.toBe('abc123');
    expect(res.set!.dice).toEqual([res.dice[0].id, res.dice[0].id]);
  });

  it('overwrite keeps the local id', () => {
    const custom: Die = { ...structuredClone(localDice[2]), color: '#00ff00' };
    const set: DiceSet = { ...structuredClone(hqSet), dice: [custom.id] };
    const plan = planImport(set, [custom], localDice, localSets, 'es');
    plan.dice[0].choice = 'overwrite';
    plan.set.choice = 'overwrite';
    const res = applyImport(plan);
    expect(res.dice[0].id).toBe(localDice[2].id);
    expect(res.dice[0].color).toBe('#00ff00');
    expect(res.set!.id).toBe(hqSet.id);
  });
});
