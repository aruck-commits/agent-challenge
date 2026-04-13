/**
 * Portfolio Sync Service
 *
 * Runs every 60 seconds. Fetches latest wallet data and updates the store.
 */

import cron from 'node-cron';
import { analyzePortfolio } from '../actions/analyzePortfolio';
import { store } from '../store';

const INTERVAL_MS = parseInt(process.env.PORTFOLIO_SYNC_INTERVAL_MS ?? '60000', 10);
// Convert ms to cron: we clamp to supported intervals
const CRON_INTERVAL = INTERVAL_MS <= 30_000 ? '*/30 * * * * *'
                    : INTERVAL_MS <= 60_000 ? '* * * * *'
                    : '*/2 * * * *';

let task: cron.ScheduledTask | null = null;

export function startPortfolioSyncService(): void {
  console.log(`[PortfolioSync] Starting — cron: "${CRON_INTERVAL}"`);

  // Run immediately on start
  void runSync();

  task = cron.schedule(CRON_INTERVAL, () => {
    void runSync();
  });

  store.setRunning(true);
}

export function stopPortfolioSyncService(): void {
  task?.stop();
  task = null;
  console.log('[PortfolioSync] Stopped');
}

async function runSync(): Promise<void> {
  const wallets = store.getWatchedWallets();
  if (wallets.length === 0) return;

  try {
    const snapshot = await analyzePortfolio();
    console.log(
      `[PortfolioSync] Synced — health: ${snapshot.healthScore}/100, value: $${snapshot.totalValue.toFixed(2)}`,
    );
  } catch (err) {
    console.error('[PortfolioSync] Sync failed:', err);
  }
}
