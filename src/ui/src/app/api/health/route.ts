import { store } from '../../../../../agent/store';
import { ensureOrionRuntime, getRuntimeStatus } from '../../../lib/server/orionRuntime';
import { ok } from '../../../lib/server/response';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureOrionRuntime();
  } catch (error) {
    const runtimeStatus = getRuntimeStatus();
    return NextResponse.json(
      {
        success: false,
        error: (error as Error)?.message ?? 'Runtime startup failed',
        data: {
          status: 'failed',
          version: '1.0.0',
          uptime: 0,
          watchedWallets: store.getWatchedWallets().length,
          lastSync: store.getLastSyncAt(),
          nosanaJobId: store.getNosanaJobId() ?? process.env.NOSANA_JOB_ID,
          runtimeStarted: runtimeStatus.started,
          elizaRuntimeActive: runtimeStatus.elizaActive,
          elizaStartupError: runtimeStatus.elizaStartupError ?? runtimeStatus.startupError,
          registeredPlugins: runtimeStatus.registeredPlugins,
          registeredClients: runtimeStatus.registeredClients,
          pluginPackage: runtimeStatus.pluginPackage,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  const uptime = Math.floor((Date.now() - new Date(store.getStartedAt()).getTime()) / 1000);
  const runtimeStatus = getRuntimeStatus();
  const heliusConfigured = Boolean(process.env.HELIUS_API_KEY?.trim());
  const isDegraded = !runtimeStatus.elizaActive || !!runtimeStatus.elizaStartupError || !heliusConfigured;

  return ok({
    status: isDegraded ? 'degraded' : 'running',
    version: '1.0.0',
    uptime,
    watchedWallets: store.getWatchedWallets().length,
    lastSync: store.getLastSyncAt(),
    nosanaJobId: store.getNosanaJobId() ?? process.env.NOSANA_JOB_ID,
    runtimeStarted: runtimeStatus.started,
    elizaRuntimeActive: runtimeStatus.elizaActive,
    elizaStartupError: runtimeStatus.elizaStartupError,
    heliusConfigured,
    registeredPlugins: runtimeStatus.registeredPlugins,
    registeredClients: runtimeStatus.registeredClients,
    pluginPackage: runtimeStatus.pluginPackage,
  });
}
