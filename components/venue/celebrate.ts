import type { StationId } from './stations';

/**
 * Fire a confetti burst over a station in the 3D venue, e.g. after casting a
 * ballot or submitting a song. Safe to call from anywhere (a no-op when the
 * venue isn't on screen).
 */
export const CELEBRATE_EVENT = 'venue:celebrate';

export type CelebrateDetail = { station: StationId };

export function celebrate(station: StationId) {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<CelebrateDetail>(CELEBRATE_EVENT, { detail: { station } }),
  );
}
