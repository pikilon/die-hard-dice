type Lockable = ScreenOrientation & {
  lock?: (o: OrientationType) => Promise<void>;
};

/** Best effort: freeze the screen orientation as it is now. Never throws. */
export function lockOrientation(): void {
  try {
    const o = screen.orientation as Lockable | undefined;
    o?.lock?.(o.type)?.catch(() => {});
  } catch {
    /* unsupported (iOS, desktop, non-fullscreen tab) */
  }
}

export function unlockOrientation(): void {
  try {
    screen.orientation?.unlock?.();
  } catch {
    /* ignore */
  }
}
