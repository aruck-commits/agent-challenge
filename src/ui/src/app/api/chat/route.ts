import { generateOrionReply } from '../../../../../agent/services/chatService';
import type { ChatRequest } from '../../../../../shared/types';
import { ensureOrionRuntime } from '../../../lib/server/orionRuntime';
import { ok } from '../../../lib/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  await ensureOrionRuntime();

  const { message, history } = (await req.json().catch(() => ({}))) as ChatRequest;
  const reply = await generateOrionReply(message ?? '', history ?? []);

  return ok(reply);
}
