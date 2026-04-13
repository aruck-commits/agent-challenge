import { store } from '../../../../../../agent/store';
import { ensureOrionRuntime } from '../../../../lib/server/orionRuntime';
import { ok } from '../../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureOrionRuntime();

  const alerts = store.getAlerts();
  const summary = {
    total: alerts.length,
    high: alerts.filter(a => a.severity === 'HIGH').length,
    medium: alerts.filter(a => a.severity === 'MEDIUM').length,
    low: alerts.filter(a => a.severity === 'LOW').length,
  };

  return ok(summary);
}
