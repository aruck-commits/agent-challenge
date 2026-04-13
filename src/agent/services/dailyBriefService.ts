/**
 * Daily Brief Service
 *
 * Runs once per day at 08:00 UTC. Generates a morning risk summary
 * and sends it via Telegram (if configured) and stores it for dashboard.
 */

import cron from 'node-cron';
import { store } from '../store';
import { suggestRebalance } from '../actions/suggestRebalance';
import { scoreToLabel } from '../../shared/risk';
import type { DailyBrief } from '../../shared/types';

let lastBrief: DailyBrief | null = null;

export function startDailyBriefService(): void {
  // Run at 08:00 UTC every day
  cron.schedule('0 8 * * *', () => {
    void generateBrief();
  }, { timezone: 'UTC' });

  console.log('[DailyBrief] Scheduled for 08:00 UTC daily');
}

export async function generateBrief(): Promise<DailyBrief | null> {
  const snapshot = store.getSnapshot();
  if (!snapshot) return null;

  const suggestions = suggestRebalance();
  const alerts      = store.getAlerts();
  const rf          = snapshot.riskFactors;

  const topRisks: string[] = [];
  if (rf.volatilityScore < 70)    topRisks.push(`Asset volatility exposure (score: ${rf.volatilityScore}/100)`);
  if (rf.lpHealthScore < 70)      topRisks.push(`LP / impermanent-loss risk (score: ${rf.lpHealthScore}/100)`);
  if (rf.contractRiskScore < 70)  topRisks.push(`Smart contract exposure (score: ${rf.contractRiskScore}/100)`);
  if (rf.concentrationScore < 70) topRisks.push(`Concentration risk (score: ${rf.concentrationScore}/100)`);

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const highCount    = activeAlerts.filter(a => a.severity === 'HIGH').length;
  const medCount     = activeAlerts.filter(a => a.severity === 'MEDIUM').length;

  const alertsSummary = activeAlerts.length === 0
    ? 'No active alerts — portfolio looks healthy today.'
    : `${activeAlerts.length} active alert${activeAlerts.length > 1 ? 's' : ''}: ` +
      `${highCount} HIGH, ${medCount} MEDIUM.`;

  const label = scoreToLabel(snapshot.healthScore);

  const insight = snapshot.healthScore >= 85
    ? 'Portfolio is well-balanced with low risk exposure. Maintain current positions.'
    : snapshot.healthScore >= 70
    ? 'Portfolio is moderately healthy. Watch LP positions for further deterioration.'
    : snapshot.healthScore >= 50
    ? 'Portfolio risk is elevated. Review alerts and consider trimming high-risk positions.'
    : 'Portfolio is in HIGH risk territory. Immediate action recommended.';

  const brief: DailyBrief = {
    date:               new Date().toISOString(),
    healthScore:        snapshot.healthScore,
    topRisks,
    alertsSummary,
    recommendedActions: suggestions.slice(0, 3),
    insight,
  };

  lastBrief = brief;
  console.log(`[DailyBrief] Generated — health: ${snapshot.healthScore}/100 (${label})`);

  return brief;
}

export function getLastBrief(): DailyBrief | null {
  return lastBrief;
}
