/**
 * Wallet Provider
 *
 * Aggregates Helius + Jupiter price + Jupiter Portfolio into a
 * normalized WalletPosition snapshot ready for the risk engine.
 */

import { fetchTokenBalances, fetchRecentTransactions } from './heliusProvider';
import { fetchPrices } from './jupiterPriceProvider';
import { fetchPortfolioPositions } from './jupiterPortfolioProvider';
import type { WalletPosition } from '../../shared/types';

export async function fetchWalletPosition(walletAddress: string): Promise<WalletPosition> {
  console.log(`[WalletProvider] Fetching data for ${walletAddress}`);

  // Fetch in parallel, but keep whatever data we can if one provider fails.
  const [tokenResult, portfolioResult, txResult] = await Promise.allSettled([
    fetchTokenBalances(walletAddress),
    fetchPortfolioPositions(walletAddress),
    fetchRecentTransactions(walletAddress, 30),
  ]);

  const tokens = tokenResult.status === 'fulfilled' ? tokenResult.value : [];
  const portfolio = portfolioResult.status === 'fulfilled'
    ? portfolioResult.value
    : { lpPositions: [], stakingPositions: [] };
  const transactions = txResult.status === 'fulfilled' ? txResult.value : [];

  if (tokenResult.status === 'rejected') {
    console.warn('[WalletProvider] Falling back to empty token balances:', tokenResult.reason);
  }

  if (portfolioResult.status === 'rejected') {
    console.warn('[WalletProvider] Falling back to empty Jupiter portfolio:', portfolioResult.reason);
  }

  if (txResult.status === 'rejected') {
    console.warn('[WalletProvider] Falling back to empty transaction history:', txResult.reason);
  }

  const { lpPositions, stakingPositions } = portfolio;

  // Batch price lookup for all held token mints
  const mints = tokens.map(t => t.mint);
  // Also include LP underlying tokens
  for (const lp of lpPositions) {
    if (!mints.includes(lp.tokenA)) mints.push(lp.tokenA);
    if (!mints.includes(lp.tokenB)) mints.push(lp.tokenB);
  }

  const prices = await fetchPrices(mints);

  // Enrich token balances with prices
  const enrichedTokens = tokens.map(token => {
    const price = prices[token.mint];
    return {
      ...token,
      price:     price?.price     ?? token.price,
      value:     (price?.price ?? token.price) * token.balance,
      change24h: price?.change24h ?? token.change24h,
      change1h:  price?.change1h  ?? token.change1h,
    };
  });

  // Enrich staking positions with 24h change from price data
  const enrichedStaking = stakingPositions.map(s => ({
    ...s,
    change24h: prices[s.token]?.change24h ?? s.change24h,
  }));

  const totalValue =
    enrichedTokens.reduce((sum, t) => sum + t.value, 0) +
    lpPositions.reduce((sum, lp) => sum + lp.lpValue, 0) +
    enrichedStaking.reduce((sum, s) => sum + s.value, 0);

  // Mark transactions with known-program flag
  const enrichedTxs = transactions.map(tx => ({
    ...tx,
    knownProgram: tx.programs.every(p =>
      [
        'So11111111111111111111111111111111111111112',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1brs',
        '11111111111111111111111111111111',
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
        'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
        'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
        'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
        'ComputeBudget111111111111111111111111111111',
      ].includes(p)
    ),
  }));

  return {
    address: walletAddress,
    tokens: enrichedTokens,
    lpPositions,
    stakingPositions: enrichedStaking,
    totalValue,
    lastUpdated: new Date().toISOString(),
    recentTransactions: enrichedTxs,
  };
}

export async function fetchMultipleWallets(addresses: string[]): Promise<WalletPosition[]> {
  return Promise.all(addresses.map(fetchWalletPosition));
}
