/**
 * Local sandbox: an in-memory (but persistent on disk) MongoDB full of fake
 * data, plus `next dev` pointed at it. Never touches the real database.
 *
 *   pnpm dev:sandbox                      seed if empty, voting-stage round
 *   pnpm dev:sandbox --reset              wipe and reseed
 *   pnpm dev:sandbox --stage=submission   current round in SUBMISSION stage
 *                                         (reseeds if the stage changed)
 *
 * Sign in as a fake user at https://localhost:3000/api/dev/login
 * (?userName=maya etc., default jason).
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { seedSandbox, type SandboxStage } from './sandboxSeed';

const PORT = 27018;
const DB_NAME = 'music-tier';
const DB_PATH = path.resolve(process.cwd(), '.sandbox-db');

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  const stageArg = args.find((a) => a.startsWith('--stage='))?.split('=')[1];
  if (stageArg && stageArg !== 'voting' && stageArg !== 'submission') {
    throw new Error('--stage must be "voting" or "submission"');
  }

  fs.mkdirSync(DB_PATH, { recursive: true });
  const mongod = await MongoMemoryServer.create({
    instance: { port: PORT, dbPath: DB_PATH, ip: '127.0.0.1' },
  });
  const uri = `mongodb://127.0.0.1:${PORT}/`;
  console.log(`🧪 Sandbox MongoDB running at ${uri} (data in .sandbox-db/)`);

  let child: ReturnType<typeof spawn> | undefined;
  let stopping = false;
  const stop = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    // Kill the whole process group so next-server doesn't outlive us.
    if (child?.pid) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {}
    }
    await mongod.stop({ doCleanup: false, force: true }).catch(() => {});
    process.exit(code);
  };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());

  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(DB_NAME);
    const meta = await db.collection('sandboxMeta').findOne({});
    const isEmpty = (await db.collection('leagues').countDocuments()) === 0;
    const stageChanged = Boolean(stageArg && meta && meta.stage !== stageArg);
    const stage = (stageArg ?? meta?.stage ?? 'voting') as SandboxStage;

    if (isEmpty || reset || stageChanged) {
      console.log(`🌱 Seeding fake data (current round: ${stage})...`);
      const info = await seedSandbox(db, { stage });
      console.log(`   league  /leagues/${info.leagueId}`);
      console.log(
        `   round   /leagues/${info.leagueId}/rounds/${info.currentRoundId}`,
      );
    } else {
      const ageHours = (Date.now() - meta!.seededAt) / 3_600_000;
      console.log(
        `📦 Using existing sandbox data (seeded ${ageHours.toFixed(1)}h ago, stage: ${stage}).`,
      );
      if (ageHours > 24) {
        console.log(
          '   ⚠️  Dates are relative to seed time; run with --reset to refresh.',
        );
      }
    }
    await client.close();

    console.log('🔑 Sign in: https://localhost:3000/api/dev/login');
    child = spawn('pnpm', ['exec', 'next', 'dev', '--experimental-https'], {
      stdio: 'inherit',
      detached: true,
      env: {
        ...process.env,
        // Process env wins over .env.local in Next.
        MONGO_DB_URI: uri,
        SANDBOX: '1',
        // Make sure nothing can reach real services from the sandbox. Pusher
        // only works if you give it its own test app (SANDBOX_PUSHER_* in
        // .env.sandbox or the environment); otherwise it's switched off.
        ...sandboxPusherEnv(),
        MAILGUN_API_KEY: 'sandbox-disabled',
        MAILGUN_DOMAIN: 'sandbox.invalid',
        VAPID_PUBLIC_KEY: '',
        VAPID_PRIVATE_KEY: '',
      },
    });
    child.on('exit', (code) => void stop(code ?? 0));
  } catch (error) {
    console.error(error);
    await stop(1);
  }
}

/**
 * A separate, free Pusher app for testing live features (who's online,
 * movement, emotes) locally. Read from SANDBOX_PUSHER_APP_ID / _KEY / _SECRET
 * / _CLUSTER in the environment or a gitignored .env.sandbox file. Without
 * them the sandbox gets a dead secret, so it can't touch the real app.
 */
function sandboxPusherEnv(): Record<string, string> {
  const file = path.resolve(process.cwd(), '.env.sandbox');
  const fromFile: Record<string, string> = {};
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*['"]?(.*?)['"]?\s*$/.exec(line);
      if (match) {
        fromFile[match[1]] = match[2];
      }
    }
  }
  const get = (name: string) => process.env[name] || fromFile[name];
  const appId = get('SANDBOX_PUSHER_APP_ID');
  const key = get('SANDBOX_PUSHER_KEY');
  const secret = get('SANDBOX_PUSHER_SECRET');
  const cluster = get('SANDBOX_PUSHER_CLUSTER') || 'us2';
  if (appId && key && secret) {
    console.log(`📡 Pusher: sandbox test app ${appId} (live features on)`);
    return {
      PUSHER_APP_ID: appId,
      NEXT_PUBLIC_PUSHER_KEY: key,
      PUSHER_SECRET: secret,
      NEXT_PUBLIC_PUSHER_CLUSTER: cluster,
    };
  }
  console.log('📡 Pusher: off (add SANDBOX_PUSHER_* to .env.sandbox for live features)');
  return { PUSHER_SECRET: 'sandbox-disabled' };
}

void main();
