import { ensureOrionRuntime } from '../../../../lib/server/orionRuntime';
import { generateBrief, getLastBrief } from '../../../../../../agent/services/dailyBriefService';
import { ok } from '../../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureOrionRuntime();

  let brief = getLastBrief();
  if (!brief) {
    brief = await generateBrief();
  }

  return ok(brief);
}
