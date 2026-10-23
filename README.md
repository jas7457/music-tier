This app uses a few different services for its features

[Twilio](https://console.twilio.com/) is used for sending text message notifications

[Mailgun](https://app.mailgun.com/) is used for sending emails.

[Pusher](https://dashboard.pusher.com/) is used for websocket messages/real time updates - sign in with Google not Github

## Sandbox

Run the app against a fake, local MongoDB (never the real one in `.env.local`):

```bash
pnpm dev:sandbox                      # seed if empty, current round in VOTING
pnpm dev:sandbox --stage=submission   # current round in SUBMISSION (reseeds)
pnpm dev:sandbox --reset              # wipe and reseed (refreshes the dates)
```

This starts an in-memory MongoDB on `127.0.0.1:27018` (persisted in
`.sandbox-db/`, gitignored), seeds 8 users, an active league, an older finished
league and 2 polls, then runs `next dev --experimental-https` with
`MONGO_DB_URI` and `SANDBOX=1` overridden. Pusher, email and push are disabled.

Sign in without Spotify at https://localhost:3000/api/dev/login
(`?userName=mayac&next=/polls` to pick another user; default `jason`). The route
returns 404 unless `SANDBOX=1`. Seed dates are relative to when it was seeded,
so run `--reset` if the data goes stale. Spotify playback/search won't work with
the fake tokens.
