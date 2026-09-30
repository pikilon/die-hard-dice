import { useSettings } from '../store/settings';

/**
 * Tiny synthesized dice sounds (no audio files): a filtered noise burst whose pitch and
 * length depend on the surface. Throttled so a pile of dice doesn't turn into white noise.
 */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let lastAt = 0;
let active = 0;

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
}

export type Surface = 'table' | 'die' | 'cup';

export function clack(force: number, surface: Surface = 'table') {
  if (!ctx || !noise || !useSettings.getState().sound) return;
  const now = ctx.currentTime;
  if (now - lastAt < 0.018 || active > 10) return;
  lastAt = now;
  const vol = Math.min(1, Math.max(0.04, force / 60)) * (surface === 'cup' ? 0.5 : 0.8);
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.5;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = surface === 'die' ? 3200 + Math.random() * 1800 : surface === 'cup' ? 900 + Math.random() * 500 : 1700 + Math.random() * 900;
  bp.Q.value = surface === 'die' ? 6 : 3;
  const g = ctx.createGain();
  const dur = surface === 'cup' ? 0.09 : surface === 'die' ? 0.05 : 0.08;
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
  src.connect(bp).connect(g).connect(ctx.destination);
  active++;
  src.onended = () => active--;
  src.start(now);
  src.stop(now + dur + 0.02);
}

export function whoosh() {
  if (!ctx || !noise || !useSettings.getState().sound) return;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.35;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(400, now);
  lp.frequency.exponentialRampToValueAtTime(2200, now + 0.25);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.25, now + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  src.connect(lp).connect(g).connect(ctx.destination);
  src.start(now);
  src.stop(now + 0.45);
}

export function haptic(ms = 12) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignore */
    }
  }
}
