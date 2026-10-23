/**
 * Whether the server is running in the local sandbox (pnpm dev:sandbox).
 *
 * Sandbox mode enables a password-less dev login and stubs out Pusher and
 * Spotify token refresh, so it must never switch on by accident: it requires
 * the SANDBOX flag, a non-production build AND a database on this machine.
 */
export function isSandbox(): boolean {
  return (
    process.env.SANDBOX === '1' &&
    process.env.NODE_ENV !== 'production' &&
    /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(
      process.env.MONGO_DB_URI ?? '',
    )
  );
}
