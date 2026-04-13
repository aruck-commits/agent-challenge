import { store } from '../../../../../agent/store';
import { ensureOrionRuntime } from '../../../lib/server/orionRuntime';
import { ok, fail } from '../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureOrionRuntime();
  const snapshot = store.getSnapshot();

  if (!snapshot) {
    return fail('No portfolio data yet. Add a wallet and wait for sync.', 404);
  }

  return ok(snapshot);
}
