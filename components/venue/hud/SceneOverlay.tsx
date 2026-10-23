'use client';

import Link from '@/components/AppLink';
import { STATION_ORDER, STATIONS, StationId } from '../stations';
import type { FriendState } from '../venueModel';
import { showBubble, useAnchorRef, useBubble } from '../scene/anchors';
import { ExpressionBubbles, SelfMenu } from './Expressions';

/**
 * DOM labels that float over the 3D scene: a name tag per station and the
 * speech bubble of whoever you tapped.
 */
export function SceneOverlay({
  showLabels,
  questStation,
  badges,
  friends,
  onSelect,
}: {
  showLabels: boolean;
  questStation: StationId | null;
  badges: Partial<Record<StationId, string>>;
  friends: FriendState[];
  onSelect: (id: StationId) => void;
}) {
  const bubble = useBubble();
  const bubbleFriend = friends.find((friend) => friend.user._id === bubble);
  return (
    <div className="venue-overlay" aria-hidden={!showLabels}>
      {showLabels &&
        STATION_ORDER.map((id) => (
          <StationLabel
            key={id}
            id={id}
            isQuest={questStation === id}
            badge={badges[id]}
            onSelect={onSelect}
          />
        ))}
      {showLabels && questStation && (
        <QuestPointer
          key={questStation}
          id={questStation}
          onSelect={onSelect}
        />
      )}
      <ExpressionBubbles />
      {bubbleFriend &&
        (bubbleFriend.isYou ? (
          <SelfMenu key="self" userId={bubbleFriend.user._id} />
        ) : (
          <FriendBubble key={bubbleFriend.user._id} friend={bubbleFriend} />
        ))}
    </div>
  );
}

function StationLabel({
  id,
  isQuest,
  badge,
  onSelect,
}: {
  id: StationId;
  isQuest: boolean;
  badge?: string;
  onSelect: (id: StationId) => void;
}) {
  const ref = useAnchorRef(`station:${id}`);
  const station = STATIONS[id];
  return (
    <div ref={ref} className="venue-anchor">
      <button
        type="button"
        onClick={() => onSelect(id)}
        className="venue-label"
        data-quest={isQuest || undefined}
        style={{ '--station-color': station.color } as React.CSSProperties}
      >
        <span aria-hidden>{station.emoji}</span>
        {station.label}
        {badge && <span className="venue-label-badge">{badge}</span>}
      </button>
    </div>
  );
}

function FriendBubble({ friend }: { friend: FriendState }) {
  const ref = useAnchorRef(`friend:${friend.user._id}`);
  return (
    <div ref={ref} className="venue-anchor">
      <div className="venue-bubble" role="status">
        <button
          type="button"
          className="venue-bubble-close"
          aria-label="Close"
          onClick={() => showBubble(null)}
        >
          ×
        </button>
        <strong>
          {friend.isYou
            ? 'You'
            : `${friend.user.firstName} ${friend.user.lastName}`.trim() ||
              friend.user.userName}
        </strong>
        <span>{friend.status}</span>
        {friend.place !== null && (
          <span className="venue-bubble-meta">
            #{friend.place} in the league · {friend.points} pts
          </span>
        )}
        <Link href={`/users/${friend.user._id}`}>View profile →</Link>
      </div>
    </div>
  );
}

/**
 * Where your next task is: hidden while the station is on screen, otherwise
 * an arrow on the screen edge pointing the way. Tap it to go there.
 */
function QuestPointer({
  id,
  onSelect,
}: {
  id: StationId;
  onSelect: (id: StationId) => void;
}) {
  const ref = useAnchorRef(`pointer:${id}`, { edge: true });
  const station = STATIONS[id];
  return (
    <div ref={ref} className="venue-anchor venue-pointer-anchor">
      <button
        type="button"
        className="venue-pointer"
        style={{ '--station-color': station.color } as React.CSSProperties}
        onClick={() => onSelect(id)}
        aria-label={`Go to the ${station.label}`}
      >
        <span className="venue-pointer-arrow" aria-hidden />
        <span className="venue-pointer-emoji" aria-hidden>
          {station.emoji}
        </span>
      </button>
    </div>
  );
}
