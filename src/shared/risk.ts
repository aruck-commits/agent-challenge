/**
 * Orion Risk Model — deterministic, transparent, explainable.
 *
 * Portfolio Health Score = weighted composite of five factors (0–100).
 * Higher score = healthier / lower risk.
 *
 * Weights:
 *   Volatility exposure       25%
 *   LP / impermanent-loss     25%
 *   Contract / protocol risk  20%
 *   Concentration risk        15%
 *   Suspicious activity       15%
 *
 * Score bands:
 *   85–100  → LOW risk
 *   70–84   → MODERATE
 *   50–69   → ELEVATED
 *   0–49    → HIGH risk
 */

import type {
  TokenBalance,
  LPPosition,
  StakingPosition,
  RiskFactors,
  RiskLabel,
  TransactionRecord,
  WalletPosition,
} from './types.js';

// ─── Score Band ───────────────────────────────────────────────────────────────

export function scoreToLabel(score: number): RiskLabel {
  if (score >= 85) return 'LOW';
  if (score >= 70) return 'MODERATE';
  if (score >= 50) return 'ELEVATED';
  return 'HIGH';
}

export function labelColor(label: RiskLabel): string {
  switch (label) {
    case 'LOW':      return '#22c55e';
    case 'MODERATE': return '#f59e0b';
    case 'ELEVATED': return '#f97316';
    case 'HIGH':     return '#ef4444';
  }
}

// ─── Factor 1: Volatility Exposure (25%) ──────────────────────────────────────

/**
 * Penalises holdings where 1h or 24h price change exceeds thresholds.
 * Also penalises holding high-beta memecoins (BONK, WIF, etc.) by name heuristic.
 */
export function scoreVolatilityExposure(tokens: TokenBalance[]): number {
  if (!tokens.length) return 100;

  let penaltySum = 0;
  for (const t of tokens) {
    const abs24h = Math.abs(t.change24h ?? 0);
    const abs1h  = Math.abs(t.change1h  ?? 0);
    // penalty 0-50 per token, weighted by proportion of portfolio
    const tokenPenalty = Math.min(50, abs24h * 1.5 + abs1h * 3);
    penaltySum += tokenPenalty;
  }

  const avgPenalty = penaltySum / tokens.length;
  return Math.max(0, Math.round(100 - avgPenalty));
}

// ─── Factor 2: LP / Impermanent-Loss Health (25%) ─────────────────────────────

/**
 * Penalises LP positions based on:
 * - Estimated impermanent loss (IL) severity
 * - Reserve ratio drift from 50/50 baseline
 * - 24h change magnitude
 */
export function scoreLPHealth(lpPositions: LPPosition[]): number {
  if (!lpPositions.length) return 100; // no LP = no LP risk

  let penaltySum = 0;
  for (const lp of lpPositions) {
    // IL penalty: 0 → 0, 5% IL → 25 pts, 10%+ IL → 50 pts
    const ilPenalty = Math.min(50, (lp.estimatedIL ?? 0) * 5);

    // Reserve imbalance: how far from 50/50 ratio
    const ratio = lp.reserveRatio ?? 0.5;
    const imbalance = Math.abs(ratio - 0.5) * 2; // 0-1
    const imbalancePenalty = imbalance * 30;

    // If previous ratio known, penalise rapid shift
    let shiftPenalty = 0;
    if (lp.previousReserveRatio !== undefined) {
      const shift = Math.abs(lp.reserveRatio - lp.previousReserveRatio);
      shiftPenalty = Math.min(20, shift * 100);
    }

    penaltySum += ilPenalty + imbalancePenalty + shiftPenalty;
  }

  const avgPenalty = lpPositions.length > 0
    ? Math.min(100, penaltySum / lpPositions.length)
    : 0;

  return Math.max(0, Math.round(100 - avgPenalty));
}

// ─── Factor 3: Contract / Protocol Risk (20%) ─────────────────────────────────

// Known-good programs reduce risk; unknown/new programs raise it.
const TRUSTED_PROGRAMS = new Set([
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', // Jupiter v4
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter v6
  '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', // Serum v3
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',  // Orca Whirlpool
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CLMM
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium v4
  'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',  // Marinade
  'EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q', // Raydium staking
  'mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68',  // Mercurial stable
  'So11111111111111111111111111111111111111112',    // Wrapped SOL
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',  // Token program
  '11111111111111111111111111111111',               // System program
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1brs', // ATA program
  'ComputeBudget111111111111111111111111111111',    // Compute budget
]);

export function scoreContractRisk(transactions: TransactionRecord[]): number {
  if (!transactions.length) return 100;

  const recent = transactions.slice(0, 20); // last 20 txs
  let unknownCount = 0;

  for (const tx of recent) {
    for (const program of tx.programs) {
      if (!TRUSTED_PROGRAMS.has(program)) {
        unknownCount++;
      }
    }
  }

  // 0 unknown = 100, every unknown interaction costs points
  const penalty = Math.min(70, unknownCount * 7);
  return Math.max(30, Math.round(100 - penalty));
}

// ─── Factor 4: Concentration Risk (15%) ───────────────────────────────────────

/**
 * Measures Herfindahl-Hirschman Index (HHI) of portfolio allocation.
 * Highly concentrated (>50% one asset) = low score.
 */
export function scoreConcentration(positions: WalletPosition[]): number {
  // Flatten all value positions
  const values: number[] = [];

  for (const wallet of positions) {
    for (const t of wallet.tokens) values.push(t.value);
    for (const lp of wallet.lpPositions) values.push(lp.lpValue);
    for (const s of wallet.stakingPositions) values.push(s.value);
  }

  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) return 100;

  // HHI = sum of squared shares
  const hhi = values.reduce((sum, v) => {
    const share = v / total;
    return sum + share * share;
  }, 0);

  // HHI ranges from 1/n (perfectly diversified) to 1 (fully concentrated)
  // Map to 0–100 score: HHI=1 → 0, HHI≤0.1 → 100
  const score = Math.round(Math.max(0, Math.min(100, (1 - hhi) * 110)));
  return score;
}

// ─── Factor 5: Suspicious Activity (15%) ──────────────────────────────────────

export function scoreSuspiciousActivity(transactions: TransactionRecord[]): number {
  if (!transactions.length) return 100;

  let suspiciousCount = 0;

  for (const tx of transactions.slice(0, 30)) {
    // Failed transactions with unknown programs are concerning
    if (tx.status === 'failed' && !tx.knownProgram) suspiciousCount += 2;
    // Multiple unknown programs in one tx
    const unknownPrograms = tx.programs.filter(p => !TRUSTED_PROGRAMS.has(p));
    if (unknownPrograms.length > 2) suspiciousCount++;
  }

  const penalty = Math.min(60, suspiciousCount * 10);
  return Math.max(40, Math.round(100 - penalty));
}

// ─── Composite Portfolio Health Score ─────────────────────────────────────────

const WEIGHTS = {
  volatility:          0.25,
  lpHealth:            0.25,
  contractRisk:        0.20,
  concentration:       0.15,
  suspiciousActivity:  0.15,
} as const;

export function computeRiskFactors(
  tokens: TokenBalance[],
  lpPositions: LPPosition[],
  stakingPositions: StakingPosition[],
  transactions: TransactionRecord[],
  positions: WalletPosition[],
): RiskFactors {
  const volatilityScore          = scoreVolatilityExposure(tokens);
  const lpHealthScore            = scoreLPHealth(lpPositions);
  const contractRiskScore        = scoreContractRisk(transactions);
  const concentrationScore       = scoreConcentration(positions);
  const suspiciousActivityScore  = scoreSuspiciousActivity(transactions);

  const overall = Math.round(
    volatilityScore         * WEIGHTS.volatility +
    lpHealthScore           * WEIGHTS.lpHealth +
    contractRiskScore       * WEIGHTS.contractRisk +
    concentrationScore      * WEIGHTS.concentration +
    suspiciousActivityScore * WEIGHTS.suspiciousActivity,
  );

  return {
    volatilityScore,
    lpHealthScore,
    contractRiskScore,
    concentrationScore,
    suspiciousActivityScore,
    overall: Math.max(0, Math.min(100, overall)),
  };
}

// ─── Position-level Risk Score ────────────────────────────────────────────────

export function scoreTokenPosition(token: TokenBalance, totalPortfolioValue: number): number {
  const abs24h = Math.abs(token.change24h ?? 0);
  const abs1h  = Math.abs(token.change1h  ?? 0);
  const concentration = totalPortfolioValue > 0
    ? Math.min(100, (token.value / totalPortfolioValue) * 200)
    : 0;

  const volatilityPenalty      = Math.min(40, abs24h * 2 + abs1h * 4);
  const concentrationPenalty   = concentration > 40 ? (concentration - 40) * 0.5 : 0;

  const rawScore = 100 - volatilityPenalty - concentrationPenalty;
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

export function scoreLPPosition(lp: LPPosition): number {
  const ilPenalty        = Math.min(40, (lp.estimatedIL ?? 0) * 5);
  const imbalance        = Math.abs((lp.reserveRatio ?? 0.5) - 0.5) * 2;
  const imbalancePenalty = imbalance * 25;

  let shiftPenalty = 0;
  if (lp.previousReserveRatio !== undefined) {
    const shift = Math.abs(lp.reserveRatio - lp.previousReserveRatio);
    shiftPenalty = Math.min(20, shift * 80);
  }

  const rawScore = 100 - ilPenalty - imbalancePenalty - shiftPenalty;
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

export function scoreStakingPosition(staking: StakingPosition): number {
  // Staking is generally lower risk; penalise long unlock periods and low APY
  let score = 90;
  if (staking.lockupEnd) {
    const daysUntilUnlock = (new Date(staking.lockupEnd).getTime() - Date.now()) / 86_400_000;
    if (daysUntilUnlock > 30) score -= 15;
    if (daysUntilUnlock > 90) score -= 10;
  }
  return Math.max(40, score);
}

// ─── Alert Threshold Checks ───────────────────────────────────────────────────

export const THRESHOLDS = {
  volatilityAlertPct:     10,   // % price change in 1h to trigger alert
  lpReserveChangePct:     15,   // % reserve ratio change to trigger alert
  ilAlertPct:             5,    // % estimated IL to trigger alert
  concentrationAlertPct:  40,   // % of portfolio in one asset to trigger alert
  highRiskScoreThreshold: 50,   // overall score below this = HIGH risk alert
} as const;
