import { scorePortfolioRisk } from '../../../../../../agent/actions/scorePortfolioRisk';
import { ensureOrionRuntime } from '../../../../lib/server/orionRuntime';
import { ok } from '../../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureOrionRuntime();
  const positions = scorePortfolioRisk();
  return ok(positions);
}
