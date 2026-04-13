import 'dotenv/config';

import { store } from './store';
import { startPortfolioSyncService } from './services/portfolioSyncService';
import { startMonitorService } from './services/monitorService';
import { startAlertService } from './services/alertService';
import { startDailyBriefService } from './services/dailyBriefService';
import { startElizaRuntime } from './elizaRuntime';

console.warn('[Orion] Legacy Express entrypoint is deprecated. Use Next.js route handlers instead.');

// ─── Seed Wallets from Env ────────────────────────────────────────────────────

const seedWallets = (process.env.WATCHED_WALLETS ?? '')
  .split(',')
  .map(w => w.trim())
  .filter(w => w.length >= 32);

for (const wallet of seedWallets) {
  store.addWallet(wallet);
}

// ─── Start Background Services ────────────────────────────────────────────────

startAlertService();
startPortfolioSyncService();
startMonitorService();
startDailyBriefService();
void startElizaRuntime().catch(error => {
  console.warn('[Eliza] Runtime startup failed:', error);
});
