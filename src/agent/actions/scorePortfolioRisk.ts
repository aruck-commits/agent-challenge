/**
 * Action: scorePortfolioRisk
 *
 * Computes position-level risk scores for all held assets.
 * Returns an array of PositionRisk objects ready for the dashboard table.
 */

import {
  scoreTokenPosition,
  scoreLPPosition,
  scoreStakingPosition,
  scoreToLabel,
} from '../../shared/risk';
import { store } from '../store';
import type { PositionRisk } from '../../shared/types';

export function scorePortfolioRisk(): PositionRisk[] {
  const snapshot = store.getSnapshot();
  if (!snapshot) return [];

  const results: PositionRisk[] = [];

  for (const wallet of snapshot.positions) {
    // Token positions
    for (const token of wallet.tokens) {
      if (token.value < 1) continue; // skip dust
      const score = scoreTokenPosition(token, snapshot.totalValue);
      results.push({
        id:           `${wallet.address}-token-${token.mint}`,
        name:         token.symbol,
        protocol:     'Wallet',
        positionType: 'TOKEN',
        value:        token.value,
        change24h:    token.change24h,
        riskScore:    score,
        riskLabel:    scoreToLabel(score),
        reasons:      buildTokenReasons(token, score, snapshot.totalValue),
      });
    }

    // LP positions
    for (const lp of wallet.lpPositions) {
      const score = scoreLPPosition(lp);
      results.push({
        id:           `${wallet.address}-lp-${lp.poolAddress}`,
        name:         `${lp.tokenASymbol}-${lp.tokenBSymbol} LP`,
        protocol:     lp.protocol,
        positionType: 'LP',
        value:        lp.lpValue,
        change24h:    lp.change24h,
        riskScore:    score,
        riskLabel:    scoreToLabel(score),
        reasons:      buildLPReasons(lp, score),
      });
    }

    // Staking positions
    for (const s of wallet.stakingPositions) {
      const score = scoreStakingPosition(s);
      results.push({
        id:           `${wallet.address}-staking-${s.token}`,
        name:         `${s.symbol} Staking`,
        protocol:     s.protocol,
        positionType: 'STAKING',
        value:        s.value,
        change24h:    s.change24h,
        riskScore:    score,
        riskLabel:    scoreToLabel(score),
        reasons:      buildStakingReasons(s, score),
      });
    }
  }

  // Sort by risk score ascending (most risky first)
  return results.sort((a, b) => a.riskScore - b.riskScore);
}

function buildTokenReasons(token: any, score: number, totalValue: number): string[] {
  const reasons: string[] = [];
  const abs24h = Math.abs(token.change24h ?? 0);
  const abs1h  = Math.abs(token.change1h  ?? 0);
  const allocation = totalValue > 0 ? (token.value / totalValue) * 100 : 0;

  if (abs1h >= 5)  reasons.push(`${abs1h.toFixed(1)}% move in 1h`);
  if (abs24h >= 10) reasons.push(`${abs24h.toFixed(1)}% move in 24h`);
  if (allocation > 35) reasons.push(`${allocation.toFixed(0)}% portfolio concentration`);
  if (score >= 85)  reasons.push('Low volatility, well-diversified');
  if (!reasons.length) reasons.push('Within normal range');
  return reasons;
}

function buildLPReasons(lp: any, score: number): string[] {
  const reasons: string[] = [];
  const il = lp.estimatedIL ?? 0;
  const ratio = lp.reserveRatio ?? 0.5;
  const imbalance = Math.abs(ratio - 0.5) * 200;
  const shift = lp.previousReserveRatio
    ? Math.abs(lp.reserveRatio - lp.previousReserveRatio) * 100 : 0;

  if (il >= 3)        reasons.push(`${il.toFixed(1)}% impermanent loss`);
  if (imbalance >= 20) reasons.push(`Pool ${imbalance.toFixed(0)}% imbalanced`);
  if (shift >= 10)    reasons.push(`Reserve shifted ${shift.toFixed(0)}pp recently`);
  if (!reasons.length) reasons.push('Balanced pool, normal IL');
  return reasons;
}

function buildStakingReasons(s: any, score: number): string[] {
  const reasons: string[] = [];
  if (s.lockupEnd) {
    const days = (new Date(s.lockupEnd).getTime() - Date.now()) / 86_400_000;
    if (days > 0) reasons.push(`${Math.ceil(days)}d lockup remaining`);
  }
  if (s.apy < 3)  reasons.push('Low yield');
  if (s.apy > 20) reasons.push('High APY — verify sustainability');
  if (!reasons.length) reasons.push(`${s.apy.toFixed(1)}% APY, liquid`);
  return reasons;
}
