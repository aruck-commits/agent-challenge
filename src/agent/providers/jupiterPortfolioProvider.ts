/**
 * Jupiter Portfolio Provider (beta)
 *
 * Fetches LP positions, staking, and DeFi protocol exposure from
 * Jupiter's Portfolio API. This is the key integration for understanding
 * a user's full DeFi footprint beyond raw token balances.
 *
 * API: https://portfolio-api.jup.ag/v1/portfolio?wallet=<address>
 *
 * Production-only provider. Errors are surfaced to callers.
 */

import axios from 'axios';
import type { LPPosition, StakingPosition } from '../../shared/types';

const PORTFOLIO_API = process.env.JUPITER_PORTFOLIO_API ?? 'https://portfolio-api.jup.ag/v1';

// ─── Portfolio Fetch ──────────────────────────────────────────────────────────

interface JupiterPortfolioResponse {
  positions?: JupiterPosition[];
  stakingAccounts?: JupiterStaking[];
}

interface JupiterPosition {
  protocol: string;
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  tokenASymbol?: string;
  tokenBSymbol?: string;
  tokenAAmount: number;
  tokenBAmount: number;
  lpValue: number;
  poolShare: number;
  estimatedIL?: number;
  priceChangeA24h?: number;
  priceChangeB24h?: number;
}

interface JupiterStaking {
  protocol: string;
  mint: string;
  symbol?: string;
  stakedAmount: number;
  value: number;
  apy: number;
  lockupEnd?: string;
}

export async function fetchPortfolioPositions(walletAddress: string): Promise<{
  lpPositions: LPPosition[];
  stakingPositions: StakingPosition[];
}> {
  try {
    const res = await axios.get<JupiterPortfolioResponse>(
      `${PORTFOLIO_API}/portfolio?wallet=${walletAddress}`,
      { timeout: 15_000 },
    );

    const data = res.data;

    const lpPositions: LPPosition[] = (data.positions ?? []).map(pos => ({
      protocol: pos.protocol,
      poolAddress: pos.poolAddress,
      tokenA: pos.tokenA,
      tokenB: pos.tokenB,
      tokenASymbol: pos.tokenASymbol ?? pos.tokenA.slice(0, 6),
      tokenBSymbol: pos.tokenBSymbol ?? pos.tokenB.slice(0, 6),
      lpValue: pos.lpValue,
      tokenAAmount: pos.tokenAAmount,
      tokenBAmount: pos.tokenBAmount,
      poolShare: pos.poolShare,
      estimatedIL: pos.estimatedIL ?? 0,
      change24h: ((pos.priceChangeA24h ?? 0) + (pos.priceChangeB24h ?? 0)) / 2,
      reserveRatio: pos.tokenAAmount /
        Math.max(1, pos.tokenAAmount + pos.tokenBAmount),
      apy: 0, // not always available
    }));

    const stakingPositions: StakingPosition[] = (data.stakingAccounts ?? []).map(s => ({
      protocol: s.protocol,
      token: s.mint,
      symbol: s.symbol ?? 'Unknown',
      stakedAmount: s.stakedAmount,
      value: s.value,
      apy: s.apy,
      lockupEnd: s.lockupEnd,
      change24h: 0,
    }));

    return { lpPositions, stakingPositions };
  } catch (err) {
    console.error('[Jupiter Portfolio] API unavailable:', err);
    throw new Error('Failed to fetch Jupiter portfolio positions.');
  }
}
