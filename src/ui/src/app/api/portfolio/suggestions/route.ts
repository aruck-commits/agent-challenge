import { suggestRebalance } from '../../../../../../agent/actions/suggestRebalance';
import { ensureOrionRuntime } from '../../../../lib/server/orionRuntime';
import { ok } from '../../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureOrionRuntime();
  const suggestions = suggestRebalance();
  return ok(suggestions);
}
