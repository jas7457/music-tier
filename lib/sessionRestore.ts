// Shared between proxy.ts and /api/auth/restore.
export const RESTORE_PATH = '/api/auth/restore';
// Set for a few minutes after a failed restore so page loads don't keep
// bouncing through the restore route.
export const RESTORE_FAILED_COOKIE = 'session_restore_failed';
