import { store } from '../../../../../agent/store';
import { ensureOrionRuntime } from '../../../lib/server/orionRuntime';
import { ok } from '../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  await ensureOrionRuntime();

  const url = new URL(req.url);
  const includeDismissed = url.searchParams.get('all') === 'true';
  const alerts = store.getAlerts(includeDismissed);

  return ok(alerts);
}
