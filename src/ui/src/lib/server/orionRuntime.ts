import { store } from '../../../../agent/store';
import { startPortfolioSyncService } from '../../../../agent/services/portfolioSyncService';
import { startMonitorService } from '../../../../agent/services/monitorService';
import { startAlertService } from '../../../../agent/services/alertService';
import { startDailyBriefService } from '../../../../agent/services/dailyBriefService';
import { startElizaRuntime, getElizaRuntime, getElizaRuntimeDiagnostics } from '../../../../agent/elizaRuntime';

const RUNTIME_FLAG = '__orion_next_runtime_started__';
const RUNTIME_PROMISE_FLAG = '__orion_next_runtime_start_promise__';
const RUNTIME_ERROR_FLAG = '__orion_next_runtime_start_error__';

type GlobalRuntime = typeof globalThis & {
  [RUNTIME_FLAG]?: boolean;
  [RUNTIME_PROMISE_FLAG]?: Promise<void>;
  [RUNTIME_ERROR_FLAG]?: string;
};

function seedWalletsFromEnv(): void {
  const seedWallets = (process.env.WATCHED_WALLETS ?? '')
    .split(',')
    .map(w => w.trim())
    .filter(w => w.length >= 32);

  for (const wallet of seedWallets) {
    store.addWallet(wallet);
  }
}

async function startRuntime(): Promise<void> {
  const g = globalThis as GlobalRuntime;
  if (g[RUNTIME_FLAG]) return;

  seedWalletsFromEnv();

  startAlertService();
  startPortfolioSyncService();
  startMonitorService();
  startDailyBriefService();
  g[RUNTIME_FLAG] = true;
  g[RUNTIME_ERROR_FLAG] = undefined;

  try {
    await startElizaRuntime();
  } catch (error) {
    g[RUNTIME_ERROR_FLAG] = (error as Error)?.message ?? String(error);
    console.warn('[Eliza] Runtime startup failed:', error);
  }
}

export async function ensureOrionRuntime(): Promise<void> {
  const g = globalThis as GlobalRuntime;
  if (g[RUNTIME_FLAG]) {
    const eliza = getElizaRuntimeDiagnostics();
    if (!getElizaRuntime() && !eliza.startupError) {
      try {
        await startElizaRuntime();
      } catch (error) {
        g[RUNTIME_ERROR_FLAG] = (error as Error)?.message ?? String(error);
      }
    }
    return;
  }

  if (!g[RUNTIME_PROMISE_FLAG]) {
    g[RUNTIME_PROMISE_FLAG] = startRuntime();
  }

  await g[RUNTIME_PROMISE_FLAG];
}

export function getRuntimeStatus() {
  const g = globalThis as GlobalRuntime;
  const eliza = getElizaRuntimeDiagnostics();
  return {
    started: !!g[RUNTIME_FLAG],
    elizaActive: !!getElizaRuntime(),
    startupError: g[RUNTIME_ERROR_FLAG],
    elizaStartupError: eliza.startupError,
    registeredPlugins: eliza.registeredPlugins,
    registeredClients: eliza.registeredClients,
    pluginPackage: eliza.pluginPackage,
  };
}
