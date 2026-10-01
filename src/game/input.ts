import { useEffect, type MouseEvent as RMouseEvent, type RefObject } from 'react';
import { useTable } from '../store/table';
import { director } from './director';

/* ---------------------------------------------------------------- accelerometer */

let motionSeen = false;
let motionListening = false;
let permission: 'unknown' | 'granted' | 'denied' = 'unknown';

type MotionCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

export const isTouch = () => typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);

function onMotion(e: DeviceMotionEvent) {
  const a = e.acceleration ?? e.accelerationIncludingGravity;
  if (!a || a.x == null || a.y == null) return;
  motionSeen = true;
  const g = e.accelerationIncludingGravity;
  if (g && g.x != null && g.y != null) director.tilt(g.x, g.y, g.z ?? 0);
  // only the linear acceleration drives the cup (gravity-free when available)
  if (e.acceleration && e.acceleration.x != null) director.motion(e.acceleration.x ?? 0, e.acceleration.y ?? 0);
}

function listen() {
  if (motionListening) return;
  motionListening = true;
  window.addEventListener('devicemotion', onMotion);
}

/** Android/desktop need no permission: start listening right away so the accelerometer is known before the first roll. */
export function initMotion() {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window) || !isTouch()) return;
  const Ctor = window.DeviceMotionEvent as MotionCtor;
  if (typeof Ctor.requestPermission === 'function') return;
  permission = 'granted';
  listen();
}

/** Must be called from a user gesture (iOS asks for permission). */
export function requestMotion() {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window) || !isTouch()) return;
  const Ctor = window.DeviceMotionEvent as MotionCtor;
  if (permission === 'granted') return listen();
  if (permission === 'denied') return;
  if (typeof Ctor.requestPermission === 'function') {
    Ctor.requestPermission()
      .then((r) => {
        permission = r;
        if (r === 'granted') listen();
      })
      .catch(() => (permission = 'denied'));
  } else {
    permission = 'granted';
    listen();
  }
}

export const motionAvailable = () => motionSeen && permission === 'granted';

/* ---------------------------------------------------------------- table pointer input */

/** True when a pointer event lies outside the browser viewport (captured pointers keep reporting there). */
const outsideViewport = (e: { clientX: number; clientY: number }) =>
  e.clientX < 0 || e.clientY < 0 || e.clientX > window.innerWidth || e.clientY > window.innerHeight;

const LONG_PRESS = 520;
const DRAG_START = 12;

/**
 * Pointer handling on the table:
 *  - drag anywhere → gather dice into the cup and shake; release → pour
 *  - click/tap a die → toggle it for reroll
 *  - right click / long press a die → context menu
 */
export function useTableInput(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    initMotion();
    let down: { x: number; y: number; hit: string | null; id: number } | null = null;
    let throwing = false;
    let longFired = false;
    let timer = 0;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const table = useTable.getState();
      if (director.isTilting) {
        director.endTilt();
        return;
      }
      if (table.motionShake) {
        director.release();
        return;
      }
      if (director.waiting) {
        // the cup waits in the middle of the table: grab it, or tap anywhere else to cancel the throw
        if (director.hitCup(e.clientX, e.clientY) && director.grab(e.clientX, e.clientY)) {
          down = { x: e.clientX, y: e.clientY, hit: null, id: e.pointerId };
          throwing = true;
          longFired = false;
          el.setPointerCapture?.(e.pointerId);
        } else director.cancel();
        return;
      }
      if (director.busy) return;
      requestMotion();
      const hit = director.pickDie(e.clientX, e.clientY);
      down = { x: e.clientX, y: e.clientY, hit, id: e.pointerId };
      longFired = false;
      throwing = false;
      el.setPointerCapture?.(e.pointerId);
      window.clearTimeout(timer);
      if (hit && e.pointerType !== 'mouse')
        timer = window.setTimeout(() => {
          if (!down || throwing) return;
          longFired = true;
          table.openMenu({ uid: hit, x: down.x, y: down.y });
        }, LONG_PRESS);
    };

    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      if (throwing) {
        // leaving the screen counts as letting go
        if (outsideViewport(e)) return onUp(e);
        director.move(e.clientX, e.clientY);
        return;
      }
      if (longFired) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_START) {
        window.clearTimeout(timer);
        const sel = useTable.getState().selected;
        if (director.press(down.x, down.y, sel.length ? sel : undefined)) {
          throwing = true;
          director.move(e.clientX, e.clientY);
        } else down = null;
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      window.clearTimeout(timer);
      const table = useTable.getState();
      if (throwing) director.release();
      else if (!longFired) {
        if (down.hit) table.toggleSelect(down.hit);
        table.closeMenu();
      }
      down = null;
      throwing = false;
    };

    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      if (director.busy) return;
      const hit = director.pickDie(e.clientX, e.clientY);
      if (hit) useTable.getState().openMenu({ uid: hit, x: e.clientX, y: e.clientY });
    };

    // the pointer left the window or the window lost focus mid-throw: no pointerup will arrive
    const bail = () => {
      if (!throwing || useTable.getState().motionShake) return;
      window.clearTimeout(timer);
      director.release();
      down = null;
      throwing = false;
    };
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) bail();
    };

    const onKey = (e: KeyboardEvent) => {
      if (!director.waiting) return;
      if (e.key === 'Escape') director.cancel();
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        director.grabAuto();
      }
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    el.addEventListener('lostpointercapture', bail);
    document.addEventListener('mouseout', onLeave);
    window.addEventListener('blur', bail);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('contextmenu', onCtx);
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
      el.removeEventListener('lostpointercapture', bail);
      document.removeEventListener('mouseout', onLeave);
      window.removeEventListener('blur', bail);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('contextmenu', onCtx);
    };
  }, [ref]);
}

/* ---------------------------------------------------------------- roll buttons */

/**
 * Handler for a roll button: the dice go into the cup, which waits in the middle of the table until
 * the user grabs it (see `useTableInput`).
 */
export function rollButtonHandlers(getUids: () => string[] | undefined) {
  return {
    onClick: (e: RMouseEvent<HTMLElement>) => {
      requestMotion();
      // with an accelerometer there is no cup: the device itself rolls the dice
      if (motionAvailable()) director.pressTilt(getUids());
      else director.press(e.clientX, e.clientY, getUids(), true);
    },
  };
}
