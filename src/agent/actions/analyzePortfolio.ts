/**
 * Action: analyzePortfolio
 *
 * Full portfolio snapshot — fetches all wallet data, computes health score,
 * runs all anomaly detectors, and returns a PortfolioSnapshot.
 */

import { fetchMultipleWallets } from '../providers/walletProvider';
import { computeRiskFactors } from '../../shared/risk';
import { store } from '../store';
import type { PortfolioSnapshot, WalletPosition } from '../../shared/types';

export async function analyzePortfolio(
  walletAddresses?: string[],
  options: { persistSnapshot?: boolean } = {},
): Promise<PortfolioSnapshot> {
  const wallets = walletAddresses?.length ? walletAddresses : store.getWatchedWallets();

  if (wallets.length === 0) {
    throw new Error('No wallets being watched. Add a wallet address first.');
  }

  const positions: WalletPosition[] = await fetchMultipleWallets(wallets);

  // Aggregate across all wallets
  const allTokens     = positions.flatMap(p => p.tokens);
  const allLPs        = positions.flatMap(p => p.lpPositions);
  const allStaking    = positions.flatMap(p => p.stakingPositions);
  const allTxs        = positions.flatMap(p => p.recentTransactions ?? []);
  const totalValue    = positions.reduce((sum, p) => sum + p.totalValue, 0);

  // Compute risk factors
  const riskFactors = computeRiskFactors(allTokens, allLPs, allStaking, allTxs, positions);

  // Calculate P&L
  const prev = store.getPreviousSnapshot();
  const prevValue = prev?.totalValue ?? totalValue;
  const change24h = totalValue - prevValue;
  const change24hPercent = prevValue > 0 ? (change24h / prevValue) * 100 : 0;

  const snapshot: PortfolioSnapshot = {
    walletAddresses: wallets,
    totalValue,
    change24h,
    change24hPercent,
    healthScore: riskFactors.overall,
    positions,
    riskFactors,
    timestamp: new Date().toISOString(),
  };

  if (options.persistSnapshot !== false) {
    store.setSnapshot(snapshot);
  }
  return snapshot;
}
