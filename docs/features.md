# Music Tier — Feature Documentation

Music Tier is a social music league app where groups of friends form **leagues**, take turns creating themed **rounds**, submit songs via Spotify, vote on each other's submissions, and guess who submitted what. The app integrates with Spotify for song search/playback and delivers notifications via push, email, and SMS.

---

## App Structure

The app is organized around three core concepts:

- **League** — A group of users who play together across multiple rounds
- **Round** — A themed challenge within a league where each user submits a song
- **Stage** — Each round progresses through stages: **Upcoming → Submission → Voting → Completed**

There are also special round types:

- **Kickoff Rounds** — Created by designated users before the main league rounds
- **Bonus Rounds** — Extra rounds created by designated users, separate from the main rotation

---

## Round Stages

### 1. Upcoming

The round has been created but the submission window hasn't opened yet.

| Feature                | Description                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Round info display** | Title, description, creator avatar, submission/voting dates shown                                                                                |
| **Round editing**      | The round creator can edit the title and description inline                                                                                      |
| **Status pills**       | Shows "Upcoming" pill; conditionally shows "Bonus Round" or "Kickoff Round"                                                                      |
| **Hidden rounds**      | If prior rounds haven't completed, description is masked: _"X has submitted their round, but masking until the previous rounds have completed."_ |
| **On Deck songs**      | Users can pre-save candidate songs to a personal "On Deck" list via Spotify search for later consideration                                       |
| **Round navigation**   | Previous/next round links available on the round detail page                                                                                     |

### 2. Submission

The submission window is open. Users search for and submit a song.

| Feature                   | Description                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| **Spotify song search**   | Dual-mode input: free text search or paste a Spotify URL to auto-resolve a track                  |
| **Song submission**       | Submit a song with album art, title, and artist info pulled from Spotify                          |
| **Optional note**         | Attach a personal note to the submission explaining the song choice                               |
| **Optional YouTube URL**  | Attach a YouTube link; validates and shows an embedded player preview                             |
| **Duplicate detection**   | Warns if the same artist or exact song was already submitted in the league; user can force-submit |
| **On Deck integration**   | On Deck songs appear in the submission form — click one to pre-fill the submission                |
| **Change submission**     | Users can update their submission before the deadline                                             |
| **Submission tracking**   | Shows avatars and timestamps of who has/hasn't submitted                                          |
| **Locked submissions**    | After the deadline, submissions are locked with a clear message                                   |
| **Pending round creator** | If the round creator hasn't created the round yet, other users see a waiting message              |

**Notifications triggered:**

- `ROUND.STARTED` — Sent to all league users when submission opens
- `SUBMISSIONS.HALF_SUBMITTED` — Sent to non-submitters when half the users have submitted
- `SUBMISSIONS.LAST_TO_SUBMIT` — Sent to the last remaining non-submitter
- `SUBMISSION.REMINDER` — Scheduled 12 hours before the submission deadline for non-submitters

### 3. Voting

All submissions are in. Users distribute points across songs and guess who submitted each one.

| Feature                     | Description                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Vote distribution**       | Users have a fixed number of votes per round (configured per league) to distribute across submissions using +/- buttons |
| **Self-vote restriction**   | Users cannot vote on their own submission                                                                               |
| **Remaining votes counter** | Prominently displays how many votes are left to allocate                                                                |
| **Vote notes**              | Optional text note for each submission explaining the vote                                                              |
| **Draft persistence**       | Votes are saved to localStorage, surviving page refreshes                                                               |
| **YouTube embeds**          | Each submission shows its YouTube player if provided                                                                    |
| **Guessing phase**          | After distributing votes, users advance to guess who submitted each song                                                |
| **Guess dropdown**          | Select from league members (excluding self); already-guessed users are filtered from other dropdowns                    |
| **Clear guess**             | Can un-assign a guess                                                                                                   |
| **Submit votes**            | Final submit sends all votes and guesses to the server                                                                  |
| **Post-vote view**          | After submitting, shows aggregate point totals per submission and guess correctness feedback (✓/✗)                      |
| **Voter tracking**          | Shows which users have/haven't voted with avatars and vote timestamps                                                   |
| **Spotify playlist**        | Create a Spotify playlist of all submitted songs for the round                                                          |
| **On Deck → Side Playlist** | On Deck songs can be individually saved to a shared "Side Playlist" on Spotify                                          |

**Notifications triggered:**

- `VOTING.STARTED` — Sent to all league users when voting opens
- `ROUND.HALF_VOTED` — Sent to non-voters when half the users have voted
- `ROUND.LAST_TO_VOTE` — Sent to the last remaining non-voter
- `VOTING.REMINDER` — Scheduled 12 hours before the voting deadline for non-voters

### 4. Completed

Voting is done. Results are revealed.

| Feature                     | Description                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Ranked results**          | Submissions ranked by total points with place medals (🥇 🥈 🥉) and colored borders                    |
| **Submitter reveal**        | Each song's submitter is shown with their avatar                                                       |
| **Submitter notes**         | The submitter's personal note is displayed                                                             |
| **Points breakdown**        | Total points and voter count per submission                                                            |
| **Voter details**           | Each voter listed with avatar, username, points given, and optional note                               |
| **Guess results**           | All guesses shown grouped into correct (green) and incorrect (red) with guesser → guessed user avatars |
| **Your guess feedback**     | Shows your guess with ✓/✗ overlay on each submission                                                   |
| **YouTube embeds**          | YouTube players shown for submissions with URLs                                                        |
| **"Your Votes" toggle**     | Switch between Results view and a read-only view of your own votes                                     |
| **Spotify playlist**        | Listen link to the round's Spotify playlist, or create one if it doesn't exist                         |
| **On Deck → Side Playlist** | Remaining On Deck songs can still be saved to the Side Playlist                                        |

**Notifications triggered:**

- `ROUND.COMPLETED` — Sent to all league users
- `ROUND.REMINDER` — Sent to the next pending round creators, prompting them to set up their round

---

## League Features

### Active League

| Feature               | Description                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Hero banner**       | Uploadable cover photo for the league with full-screen viewer and pinch-to-zoom                                       |
| **League metadata**   | Title, status pill (Active/Completed/Upcoming/Pending), member avatars, description                                   |
| **League config**     | Displays number of rounds, days for submission, days for voting, league end date                                      |
| **Rounds view**       | Current round shown as a full interactive component; upcoming, kickoff, bonus, and completed rounds listed separately |
| **Standings view**    | Toggle to see overall standings table                                                                                 |
| **Round creation**    | Users who haven't created their round yet see a creation card with title/description form                             |
| **Real-time updates** | Pusher integration for live data updates across all clients                                                           |

### Standings

| Feature                | Description                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| **Points leaderboard** | Total points per user across all completed rounds, sorted by points then wins                |
| **Place badges**       | 🥇 🥈 🥉 for top 3, numeric for the rest                                                     |
| **Win tracking**       | A "win" is the highest score in a round; ties broken by win count                            |
| **Guess accuracy**     | Per-user accuracy stats (correct, incorrect, percentage), sorted by accuracy                 |
| **Guess details**      | Expandable view per user showing each guess grouped by round with album art and ✓/✗ coloring |

### Completed League

When all rounds are finished, the league status changes to `completed`.

| Feature                     | Description                                                     |
| --------------------------- | --------------------------------------------------------------- |
| **"That's a wrap!" banner** | Shows the user's final place and total points                   |
| **Your Biggest Fan**        | The user who gave you the most total points across the league   |
| **Your Biggest Critic**     | The user who gave you the fewest total points across the league |
| **Playlist Party Playback** | Full animated league recap experience (see below)               |

**Notification triggered:**

- `LEAGUE.COMPLETED` — Sent to all league users

---

## Playlist Party Playback

A full-screen, vertical-scrolling, animated recap experience for a completed league — similar to Spotify Wrapped. Users scroll through 17 visually rich, animated screens with stats, awards, and highlights. Supports horizontal carousels, 3D flip cards, and auto-playing songs via Spotify.

### Screens (in order)

| #   | Screen                      | Description                                                                                                                                               |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Intro**                   | Animated title with league name, glow/float animations, "scroll to begin" prompt                                                                          |
| 2   | **Racing**                  | Animated race visualization replaying cumulative standings through each round. Avatars move as positions shift; spin-out/power-up effects on rank changes |
| 3   | **League Champion**         | Reveals the winner with fanfare audio, confetti particles, a crown placed on the winner's avatar, and trophy emoji. Flip to see all their submissions     |
| 4   | **Total Points**            | Current user's total points as a giant animated number with placement and medal                                                                           |
| 5   | **Top Song (Fan Favorite)** | Highest-scoring song across the league with 3D album art, glow effect, and auto-play via Spotify. Flip to see all voters                                  |
| 6   | **Your Biggest Fan**        | The user who gave you the most total points — avatar, total points, and all songs they rated                                                              |
| 7   | **Your Biggest Critic**     | The user who gave you the fewest total points                                                                                                             |
| 8   | **Most Wins**               | Carousel of users by 1st-place finishes with confetti and trophy animations                                                                               |
| 9   | **Your Top Song**           | Current user's highest-scoring submission with 3D album art and flip-to-voters                                                                            |
| 10  | **Fastest Submitters**      | Carousel of users by average submission speed with per-song timing breakdowns                                                                             |
| 11  | **Fastest Voters**          | Carousel of users by average voting speed with per-round timing                                                                                           |
| 12  | **The Conspirators**        | Pairs of users ranked by mutual points exchanged, with mystery/handshake animations                                                                       |
| 13  | **Most Consistent**         | Carousel of users by lowest points variance, showing average points and round-by-round data                                                               |
| 14  | **Most Noted Song**         | Carousel of songs with the most vote comments; flip to read all notes. Auto-plays song                                                                    |
| 15  | **Best Guessers**           | Carousel of users ranked by guess accuracy with per-guess correct/incorrect breakdown                                                                     |
| 16  | **All User Top Songs**      | Carousel of every user's personal best song ranked by points                                                                                              |
| 17  | **Summary**                 | Scrollable grid of cards covering all stats: points, speed records, fans, critics, soulmates, wins, etc.                                                  |

### Playback Features

- Keyboard navigation (Arrow Up/Down, Space, Escape)
- Scroll-snap between screens with progress dots
- 3D album art with glow extracted from album colors
- Horizontal carousels with swipe, page counter, and prev/next buttons
- Entry/exit animations per screen
- Audio fanfare on the champion screen
- Auto-play songs via Spotify on certain screens

---

## Notifications

### Delivery Channels

| Channel                | Technology           | Details                                                                                                           |
| ---------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **In-app (real-time)** | Pusher               | WebSocket-based instant delivery to connected clients                                                             |
| **Web Push**           | VAPID / `web-push`   | Browser push notifications to all registered subscriptions                                                        |
| **Email**              | Mailgun              | HTML emails with action links                                                                                     |
| **SMS**                | Email-to-SMS gateway | Translates phone numbers to carrier gateways (Verizon `@vtext.com`, AT&T `@txt.att.net`, T-Mobile `@tmomail.net`) |

### Notification Types

| Code                         | When it fires                              | Recipients                     |
| ---------------------------- | ------------------------------------------ | ------------------------------ |
| `ROUND.STARTED`              | Submission window opens                    | All league users               |
| `SUBMISSION.REMINDER`        | 12h before submission deadline (scheduled) | Non-submitters                 |
| `SUBMISSIONS.HALF_SUBMITTED` | Half of users have submitted               | Non-submitters                 |
| `SUBMISSIONS.LAST_TO_SUBMIT` | Only 1 user left to submit                 | That user                      |
| `VOTING.STARTED`             | All submissions in, voting opens           | All league users               |
| `VOTING.REMINDER`            | 12h before voting deadline (scheduled)     | Non-voters                     |
| `ROUND.HALF_VOTED`           | Half of users have voted                   | Non-voters                     |
| `ROUND.LAST_TO_VOTE`         | Only 1 user left to vote                   | That user                      |
| `ROUND.COMPLETED`            | All votes submitted                        | All league users               |
| `ROUND.REMINDER`             | A round completes                          | Next pending round creators    |
| `LEAGUE.COMPLETED`           | All rounds done                            | All league users               |
| `NOTIFICATION.FORCE`         | Admin-triggered                            | Specified users (always sends) |

### Per-User Controls

Users can individually toggle each notification type on/off in Settings. Email and SMS channels can be globally enabled/disabled independently. `NOTIFICATION.FORCE` always sends regardless of preferences.

### Scheduled Notifications

Submission and voting reminders are scheduled in MongoDB with a `pending` status and `executeAt` timestamp. A cron endpoint (`/api/cron/process-tasks`) polls for due notifications and dispatches them, then marks them `completed` or `failed`.

---

## User Settings

| Setting                      | Description                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **Phone number**             | For SMS notifications; locked once verified                                   |
| **Phone carrier**            | Verizon, AT&T, or T-Mobile (required for SMS gateway)                         |
| **Phone verification**       | 6-digit code sent via SMS, must be verified before SMS notifications work     |
| **Email address**            | For email notifications; includes "Send Test Email" button                    |
| **Push notifications**       | Enable browser push; includes test notification button with optional delay    |
| **Theme color**              | Choose an accent color from available swatches                                |
| **Notification preferences** | Per-type toggles for all 11 notification types, plus global email/SMS toggles |
| **Developer tools**          | Conditionally shown; includes service worker unregister                       |

---

## Authentication & Onboarding

| Feature                | Description                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Spotify OAuth**      | Users connect via Spotify to sign in                                                                                 |
| **Auto-login**         | Returning users with a matching Spotify ID are logged in automatically                                               |
| **Account creation**   | New users fill out first name, last name, username, optional photo URL (pre-filled from Spotify), and an invite code |
| **Session management** | JWT-based session tokens stored in cookies alongside Spotify access/refresh tokens                                   |
| **Token refresh**      | Spotify access token auto-refreshes via `/api/spotify/refresh`                                                       |

---

## Spotify Integration

| Feature               | Description                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| **Song search**       | Free text search against the Spotify API                                        |
| **URL paste**         | Paste a Spotify track URL to auto-resolve track details                         |
| **Track details**     | Fetch song metadata (title, artists, album, artwork) by track ID                |
| **Playlist creation** | Auto-generate a Spotify playlist with all submitted songs for a completed round |
| **Side Playlist**     | Save On Deck songs that weren't submitted to a shared Side Playlist             |
| **Spotify playback**  | In-app Spotify player for listening; auto-play on certain Playback screens      |
| **User profile**      | Fetch Spotify profile for avatar and display name                               |

---

## Other Features

| Feature                 | Description                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Pull-to-refresh**     | Custom pull-to-refresh with visual indicator                                             |
| **Haptic feedback**     | All interactive buttons use haptic feedback on mobile                                    |
| **Toast notifications** | Success/error toasts throughout the app                                                  |
| **Real-time updates**   | Pusher WebSocket integration for live data sync                                          |
| **Christmas mode**      | Overlays a holiday-themed background image during Christmas                              |
| **Hero image upload**   | League cover photos uploaded via UploadThing                                             |
| **Responsive layout**   | Header with logo, user avatar dropdown (profile, settings, current league/round, logout) |
| **PWA support**         | Service worker, web manifest, and push subscription management                           |
