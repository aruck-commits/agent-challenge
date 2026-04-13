import { createTelegramConnectSession } from '../../../../../../../../agent/services/alertService';
import { normalizeSolanaAddress } from '../../../../../../../../agent/utils/validation';
import { ensureOrionRuntime } from '../../../../../../lib/server/orionRuntime';
import { requireWallet } from '../../../../../../lib/server/auth';
import { ok, fail } from '../../../../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  await ensureOrionRuntime();
  const walletHeader = normalizeSolanaAddress(await requireWallet(req));

  if (!walletHeader) {
    return fail('Valid Solana wallet address required', 400);
  }

  const result = createTelegramConnectSession();
  if (!result.success || !result.sessionId || !result.connectUrl) {
    return fail(result.error ?? 'Unable to create Telegram connect session', 400);
  }

  return ok({
    sessionId: result.sessionId,
    connectUrl: result.connectUrl,
  });
}
