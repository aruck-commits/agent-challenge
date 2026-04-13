import { store } from '../../../../../../../agent/store';
import { normalizeSolanaAddress } from '../../../../../../../agent/utils/validation';
import { ensureOrionRuntime } from '../../../../../lib/server/orionRuntime';
import { requireWallet } from '../../../../../lib/server/auth';
import { ok, fail } from '../../../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  await ensureOrionRuntime();
  const walletHeaderRaw = await requireWallet(_req);
  const walletHeader = normalizeSolanaAddress(walletHeaderRaw);

  if (!walletHeader) {
    return fail('Valid Solana wallet address required', 400);
  }

  const { id } = await context.params;
  const alert = store.getAlertById(id);

  if (!alert) {
    return fail('Alert not found', 404);
  }

  if (alert.walletAddress !== walletHeader) {
    return fail('Wallet not authorized for this alert', 403);
  }

  const dismissed = store.dismissAlert(id);

  if (!dismissed) {
    return fail('Alert not found', 404);
  }

  return ok({ dismissed: true });
}
