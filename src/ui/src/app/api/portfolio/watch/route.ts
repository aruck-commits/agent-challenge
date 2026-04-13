import { analyzePortfolio } from '../../../../../../agent/actions/analyzePortfolio';
import { store } from '../../../../../../agent/store';
import { normalizeSolanaAddress } from '../../../../../../agent/utils/validation';
import { ensureOrionRuntime } from '../../../../lib/server/orionRuntime';
import { requireWallet } from '../../../../lib/server/auth';
import { ok, fail } from '../../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  await ensureOrionRuntime();
  const walletHeaderRaw = await requireWallet(req);
  const walletHeader = normalizeSolanaAddress(walletHeaderRaw);

  if (!walletHeader) {
    return fail('Valid Solana wallet address required', 400);
  }

  const heliusConfigured = Boolean(process.env.HELIUS_API_KEY?.trim());
  if (!heliusConfigured) {
    return fail('HELIUS_API_KEY is required to watch wallets.', 503);
  }

  const body = (await req.json().catch(() => ({}))) as { address?: string };
  const normalized = normalizeSolanaAddress(body.address ?? walletHeader);

  if (!normalized || normalized !== walletHeader) {
    return fail('Invalid Solana wallet address', 400);
  }

  const added = store.addWallet(normalized);
  if (!added) {
    return fail('Wallet already being watched', 409);
  }

  void analyzePortfolio().catch(console.error);

  return ok({ address: normalized, watching: store.getWatchedWallets() });
}

export async function DELETE(req: Request) {
  await ensureOrionRuntime();
  const walletHeaderRaw = await requireWallet(req);
  const walletHeader = normalizeSolanaAddress(walletHeaderRaw);

  if (!walletHeader) {
    return fail('Valid Solana wallet address required', 400);
  }

  const body = (await req.json().catch(() => ({}))) as { address?: string };
  const normalized = normalizeSolanaAddress(body.address ?? walletHeader);

  if (!normalized || normalized !== walletHeader) {
    return fail('Valid Solana address required', 400);
  }

  const removed = store.removeWallet(normalized);
  if (!removed) {
    return fail('Wallet not found', 404);
  }

  return ok({ removed: true, watching: store.getWatchedWallets() });
}
