/**
 * Live presence in the venue: one Pusher presence channel per league.
 * Shared by the auth route (server) and the venue (client).
 */

const PREFIX = 'presence-venue-';

export function venueChannelName(leagueId: string) {
  return `${PREFIX}${leagueId}`;
}

/** The league id of a venue presence channel, or null for anything else. */
export function parseVenueChannel(channel: string): string | null {
  const match = /^presence-venue-([a-f0-9]{24})$/.exec(channel);
  return match ? match[1] : null;
}

/** What other players see about you while you're online. */
export type VenueMemberInfo = {
  userName: string;
  photoUrl?: string;
};
