'use client';

import Link from '@/components/AppLink';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/lib/AuthContext';
import type { PanelProps } from './types';

/** The exit: other leagues, your profile, settings, sign out. */
export function ExitPanel({ league, user, otherLeagues }: PanelProps) {
  const { logout } = useAuth();
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const others = otherLeagues.filter((l) => l._id !== league._id);
  return (
    <div className="venue-panel">
      <section className="venue-card flex items-center gap-3">
        <Avatar user={user} size={12} includeLink={false} />
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-ink-subtle">@{user.userName}</div>
        </div>
        <Link href={`/users/${user._id}`} className="venue-chip">
          Profile
        </Link>
      </section>

      {others.length > 0 && (
        <section>
          <h3 className="venue-section-title">Other venues</h3>
          <div className="grid gap-2">
            {others.map((other) => (
              <Link key={other._id} href={`/leagues/${other._id}`} className="venue-row">
                <span className="text-2xl" aria-hidden>
                  {other.leagueStartDate > now ? '🎟️' : '🏚️'}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{other.title}</div>
                  <div className="text-xs text-ink-subtle">
                    {other.leagueStartDate > now ? 'Opening soon' : 'Past league'} ·{' '}
                    {other.memberCount} players
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-2">
        <Link href="/settings" className="venue-row">
          <span className="text-2xl" aria-hidden>⚙️</span>
          <span className="font-semibold">Settings & notifications</span>
        </Link>
        <Link href="/polls" className="venue-row">
          <span className="text-2xl" aria-hidden>📊</span>
          <span className="font-semibold">All polls</span>
        </Link>
        <button type="button" className="venue-row" onClick={() => logout()}>
          <span className="text-2xl" aria-hidden>👋</span>
          <span className="font-semibold">Leave (sign out)</span>
        </button>
      </section>
    </div>
  );
}
