/**
 * Action: detectLiquidityAnomaly
 *
 * Detects LP positions with abnormal reserve changes,
 * high impermanent loss, or rapid pool imbalance shifts.
 */

import { v4 as uuidv4 } from 'uuid';
import { THRESHOLDS } from '../../shared/risk';
import { store } from '../store';
import type { Alert, LPPosition } from '../../shared/types';

export function detectLiquidityAnomalies(walletAddress: string): Alert[] {
  const snapshot = store.getSnapshot();
  if (!snapshot) return [];

  const wallet = snapshot.positions.find(p => p.address === walletAddress)
    ?? snapshot.positions[0];
  if (!wallet) return [];

  const alerts: Alert[] = [];

  for (const lp of wallet.lpPositions) {
    const alerts_for_lp = detectForLP(lp, walletAddress);
    alerts.push(...alerts_for_lp);
  }

  return alerts;
}

function detectForLP(lp: LPPosition, walletAddress: string): Alert[] {
  const results: Alert[] = [];

  const ratio = lp.reserveRatio;
  const prevRatio = lp.previousReserveRatio ?? ratio;
  const ratioShift = Math.abs(ratio - prevRatio) * 100; // as % points
  const imbalancePct = Math.abs(ratio - 0.5) * 200;     // how far from 50/50, 0–100
  const il = lp.estimatedIL ?? 0;

  // Check 1: Pool reserve shifted significantly
  if (ratioShift >= THRESHOLDS.lpReserveChangePct) {
    const severity = ratioShift >= 30 ? 'HIGH' : ratioShift >= 15 ? 'MEDIUM' : 'LOW';
    const alert: Alert = {
      id: uuidv4(),
      severity,
      type: 'LP_HEALTH',
      title: `${lp.tokenASymbol}-${lp.tokenBSymbol} LP pool balance shifted sharply`,
      description:
        `Your ${lp.protocol} ${lp.tokenASymbol}/${lp.tokenBSymbol} pool ratio moved from ` +
        `${(prevRatio * 100).toFixed(0)}/${(100 - prevRatio * 100).toFixed(0)} to ` +
        `${(ratio * 100).toFixed(0)}/${(100 - ratio * 100).toFixed(0)} ` +
        `— a ${ratioShift.toFixed(1)}pp shift. Estimated IL: ${il.toFixed(1)}%.`,
      suggestedAction:
        severity === 'HIGH'
          ? `Consider removing ${Math.round(ratioShift)}–${Math.round(ratioShift + 15)}% of your LP position to lock in remaining value.`
          : `Monitor this pool. If imbalance continues, reduce LP exposure by 20–30%.`,
      evidence:
        `Reserve ratio: ${(ratio * 100).toFixed(1)}% ${lp.tokenASymbol} / ${(100 - ratio * 100).toFixed(1)}% ${lp.tokenBSymbol} ` +
        `| IL: ${il.toFixed(2)}% | Position value: $${lp.lpValue.toFixed(2)} | Pool: ${lp.protocol}`,
      timestamp: new Date().toISOString(),
      walletAddress,
      dismissed: false,
      protocol: lp.protocol,
      scoreDelta: -Math.round(ratioShift * 0.8),
    };
    results.push(alert);
    store.addAlert(alert);
  }

  // Check 2: High impermanent loss
  if (il >= THRESHOLDS.ilAlertPct && ratioShift < THRESHOLDS.lpReserveChangePct) {
    const severity = il >= 10 ? 'HIGH' : il >= 5 ? 'MEDIUM' : 'LOW';
    const alert: Alert = {
      id: uuidv4(),
      severity,
      type: 'LP_HEALTH',
      title: `${lp.tokenASymbol}-${lp.tokenBSymbol} impermanent loss elevated at ${il.toFixed(1)}%`,
      description:
        `Your ${lp.protocol} LP position is experiencing ${il.toFixed(2)}% estimated impermanent loss ` +
        `on a $${lp.lpValue.toFixed(2)} position. That's approximately $${(lp.lpValue * il / 100).toFixed(2)} at risk if you exit now.`,
      suggestedAction:
        `If your LP fee earnings don't offset the ${il.toFixed(1)}% IL, consider gradually removing liquidity over the next 24–48 hours.`,
      evidence:
        `IL: ${il.toFixed(2)}% | Pool share: ${(lp.poolShare * 100).toFixed(4)}% | APY: ${lp.apy?.toFixed(1) ?? 'N/A'}% | Value: $${lp.lpValue.toFixed(2)}`,
      timestamp: new Date().toISOString(),
      walletAddress,
      dismissed: false,
      protocol: lp.protocol,
      scoreDelta: -Math.round(il * 2),
    };
    results.push(alert);
    store.addAlert(alert);
  }

  return results;
}
