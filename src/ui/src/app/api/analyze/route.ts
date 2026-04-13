import { scoreToLabel } from '../../../../../shared/risk';
import { analyzePortfolio } from '../../../../../agent/actions/analyzePortfolio';
import { normalizeSolanaAddress } from '../../../../../agent/utils/validation';
import { ensureOrionRuntime } from '../../../lib/server/orionRuntime';
import { requireWallet } from '../../../lib/server/auth';
import { ok, fail } from '../../../lib/server/response';

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
    return fail('HELIUS_API_KEY is required for wallet analysis.', 503);
  }

  const { address } = (await req.json().catch(() => ({}))) as { address?: string };
  const normalized = normalizeSolanaAddress(address ?? walletHeader);

  if (!normalized || normalized !== walletHeader) {
    return fail('Valid Solana wallet address required', 400);
  }

  try {
    const snapshot = await analyzePortfolio([normalized], { persistSnapshot: false });
    const position = snapshot.positions[0];

    return ok({
      address: normalized,
      totalValue: snapshot.totalValue,
      healthScore: snapshot.healthScore,
      riskLabel: scoreToLabel(snapshot.healthScore),
      riskFactors: snapshot.riskFactors,
      alertCount: 0,
      alerts: [],
      positions: {
        tokens: position?.tokens.length ?? 0,
        lp: position?.lpPositions.length ?? 0,
        staking: position?.stakingPositions.length ?? 0,
      },
    });
  } catch (err) {
    console.error('[Analyze] Error:', err);
    return fail('Failed to analyze wallet. Check address and try again.', 500);
  }
}
