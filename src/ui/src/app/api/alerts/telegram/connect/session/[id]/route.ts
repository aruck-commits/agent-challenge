import { getTelegramConnectSessionStatus } from '../../../../../../../../../agent/services/alertService';
import { ensureOrionRuntime } from '../../../../../../../lib/server/orionRuntime';
import { ok, fail } from '../../../../../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  await ensureOrionRuntime();

  const { id } = await context.params;
  const status = await getTelegramConnectSessionStatus(id);

  if (!status.success && !status.expired) {
    return fail(status.error ?? 'Failed to get Telegram session status', 400);
  }

  return ok(status, { status: status.success ? 200 : 400 });
}
