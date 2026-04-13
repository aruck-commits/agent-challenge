/**
 * Action: suggestRebalance
 *
 * Generates actionable, ranked rebalance suggestions
 * based on the current portfolio risk snapshot.
 */

import { THRESHOLDS, scoreToLabel } from '../../shared/risk';
import { store } from '../store';
import type { RebalanceSuggestion } from '../../shared/types';

export function suggestRebalance(): RebalanceSuggestion[] {
  const snapshot = store.getSnapshot();
  if (!snapshot) return [];

  const suggestions: RebalanceSuggestion[] = [];
  const rf = snapshot.riskFactors;

  for (const wallet of snapshot.positions) {
    // LP-level suggestions
    for (const lp of wallet.lpPositions) {
      const il = lp.estimatedIL ?? 0;
      const shift = lp.previousReserveRatio
        ? Math.abs(lp.reserveRatio - lp.previousReserveRatio) * 100 : 0;

      if (il >= 8 || shift >= 25) {
        suggestions.push({
          action: 'REDUCE',
          asset: `${lp.tokenASymbol}-${lp.tokenBSymbol} LP`,
          protocol: lp.protocol,
          reason: `IL at ${il.toFixed(1)}% and pool imbalance at ${shift.toFixed(0)}pp. Exit 40–60% now.`,
          urgency: 'IMMEDIATE',
          targetReductionPct: 50,
        });
      } else if (il >= 4 || shift >= 15) {
        suggestions.push({
          action: 'REDUCE',
          asset: `${lp.tokenASymbol}-${lp.tokenBSymbol} LP`,
          protocol: lp.protocol,
          reason: `IL at ${il.toFixed(1)}%. Consider trimming 20–30% of position.`,
          urgency: 'SOON',
          targetReductionPct: 25,
        });
      }
    }

    // Token volatility suggestions
    for (const token of wallet.tokens) {
      const abs24h = Math.abs(token.change24h ?? 0);
      const allocation = snapshot.totalValue > 0
        ? (token.value / snapshot.totalValue) * 100 : 0;

      if (abs24h >= 20 && allocation >= 20) {
        suggestions.push({
          action: 'REDUCE',
          asset: token.symbol,
          protocol: 'Wallet',
          reason: `${abs24h.toFixed(1)}% move with ${allocation.toFixed(0)}% portfolio weight. High combined risk.`,
          urgency: 'SOON',
          targetReductionPct: 30,
        });
      }

      // Concentration
      if (allocation >= THRESHOLDS.concentrationAlertPct) {
        suggestions.push({
          action: 'REDUCE',
          asset: token.symbol,
          protocol: 'Wallet',
          reason: `${allocation.toFixed(0)}% of portfolio concentrated in ${token.symbol}. Diversify.`,
          urgency: 'OPTIONAL',
          targetReductionPct: 20,
        });
      }
    }
  }

  // Overall health-based catch-all
  if (rf.overall < THRESHOLDS.highRiskScoreThreshold && suggestions.length === 0) {
    suggestions.push({
      action: 'REDUCE',
      asset: 'DeFi exposure',
      protocol: 'Multiple',
      reason: `Portfolio health score is ${rf.overall}/100 (${scoreToLabel(rf.overall)}). Reduce DeFi exposure overall.`,
      urgency: 'SOON',
    });
  }

  if (rf.overall >= 85 && suggestions.length === 0) {
    suggestions.push({
      action: 'HOLD',
      asset: 'Portfolio',
      protocol: 'All',
      reason: `Portfolio health score is ${rf.overall}/100 (LOW risk). No action needed.`,
      urgency: 'OPTIONAL',
    });
  }

  // Sort: IMMEDIATE first, then SOON, then OPTIONAL
  const urgencyOrder = { IMMEDIATE: 0, SOON: 1, OPTIONAL: 2 };
  return suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
}
