/**
 * Monitor Service
 *
 * Runs every 30 seconds. Executes all three anomaly detectors
 * against the latest snapshot. New alerts are written to the store
 * and dispatched via the alert service.
 */

import cron from 'node-cron';
import { detectVolatilityAnomalies } from '../actions/detectVolatilityAnomaly';
import { detectLiquidityAnomalies } from '../actions/detectLiquidityAnomaly';
import { detectContractRiskAnomalies } from '../actions/detectContractRisk';
import { store } from '../store';

let task: cron.ScheduledTask | null = null;

export function startMonitorService(): void {
  console.log('[Monitor] Starting anomaly detection — interval: 30s');

  // Small delay so portfolio sync runs first
  setTimeout(() => {
    void runDetectors();
    task = cron.schedule('*/30 * * * * *', () => {
      void runDetectors();
    });
  }, 5_000);
}

export function stopMonitorService(): void {
  task?.stop();
  task = null;
  console.log('[Monitor] Stopped');
}

async function runDetectors(): Promise<void> {
  const snapshot = store.getSnapshot();
  if (!snapshot) return;

  let totalAlerts = 0;

  for (const wallet of snapshot.positions) {
    const addr = wallet.address;
    try {
      const va  = detectVolatilityAnomalies(addr);
      const la  = detectLiquidityAnomalies(addr);
      const ca  = detectContractRiskAnomalies(addr);
      totalAlerts += va.length + la.length + ca.length;
    } catch (err) {
      console.error(`[Monitor] Detector error for ${addr}:`, err);
    }
  }

  if (totalAlerts > 0) {
    console.log(`[Monitor] Detected ${totalAlerts} new alert(s)`);
  }
}
