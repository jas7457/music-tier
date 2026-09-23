// Square-wave blips, like the DMG's pulse channel. Kept very quiet so they
// never fight with whatever Spotify is playing.

const STORAGE_KEY = 'gb_sound';
let ctx: AudioContext | null = null;

export function isSoundOn() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) !== 'off';
}

export function setSoundOn(on: boolean) {
  window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
}

export type Blip = 'move' | 'select' | 'back' | 'menu' | 'bump';

const BLIPS: Record<Blip, Array<[freq: number, ms: number]>> = {
  move: [[1320, 28]],
  select: [
    [988, 40],
    [1976, 60],
  ],
  back: [
    [1480, 35],
    [740, 55],
  ],
  menu: [
    [660, 40],
    [880, 40],
    [1320, 60],
  ],
  bump: [[180, 45]],
};

export function blip(kind: Blip) {
  if (!isSoundOn()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    let t = ctx.currentTime;
    for (const [freq, ms] of BLIPS[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.035, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + ms / 1000);
      t += ms / 1000;
    }
  } catch {
    // Audio is a nicety; never let it break input.
  }
}

export function buzz(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // iOS has no vibrate API
  }
}
