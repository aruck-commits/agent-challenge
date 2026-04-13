import { getTelegramStatus } from '../../../../../../../agent/services/alertService';
import { ensureOrionRuntime } from '../../../../../lib/server/orionRuntime';
import { ok } from '../../../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureOrionRuntime();
  return ok(getTelegramStatus());
}
