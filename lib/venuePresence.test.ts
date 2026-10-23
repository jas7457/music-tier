import { describe, expect, it } from 'vitest';
import { parseVenueChannel, venueChannelName } from './venuePresence';

describe('venue presence channels', () => {
  it('round-trips a league id', () => {
    const leagueId = '000000000000000000005b01';
    expect(parseVenueChannel(venueChannelName(leagueId))).toBe(leagueId);
  });

  it('rejects anything that is not a venue channel', () => {
    expect(parseVenueChannel('presence-venue-')).toBeNull();
    expect(parseVenueChannel('presence-venue-not-an-id')).toBeNull();
    expect(parseVenueChannel('private-venue-000000000000000000005b01')).toBeNull();
    expect(parseVenueChannel('presence-venue-000000000000000000005b01x')).toBeNull();
  });
});
