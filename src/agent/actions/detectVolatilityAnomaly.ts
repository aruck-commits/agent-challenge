/**
 * Action: detectVolatilityAnomaly
 *
 * Detects tokens in portfolio with abnormal price movements.
 * Threshold: >10% swing in 1h or >20% in 24h.
 */

import { v4 as uuidv4 } from 'uuid';
import { THRESHOLDS } from '../../shared/risk';
import { store } from '../store';
import type { Alert } from '../../shared/types';

export function detectVolatilityAnomalies(walletAddress: string): Alert[] {
  const snapshot = store.getSnapshot();
  if (!snapshot) return [];

  const wallet = snapshot.positions.find(p => p.address === walletAddress)
    ?? snapshot.positions[0];
  if (!wallet) return [];

  const alerts: Alert[] = [];

  for (const token of wallet.tokens) {
    const abs1h  = Math.abs(token.change1h  ?? 0);
    const abs24h = Math.abs(token.change24h ?? 0);

    const triggered1h  = abs1h  >= THRESHOLDS.volatilityAlertPct;
    const triggered24h = abs24h >= THRESHOLDS.volatilityAlertPct * 2;

    if (!triggered1h && !triggered24h) continue;

    const severity = abs1h >= 20 || abs24h >= 30 ? 'HIGH'
                   : abs1h >= 10 || abs24h >= 20 ? 'MEDIUM'
                   : 'LOW';

    const direction = (token.change1h ?? token.change24h) >= 0 ? 'up' : 'down';
    const worstSwing = triggered1h ? `${abs1h.toFixed(1)}% in 1h` : `${abs24h.toFixed(1)}% in 24h`;

    const alert: Alert = {
      id: uuidv4(),
      severity,
      type: 'VOLATILITY',
      title: `${token.symbol} price volatility ${direction === 'up' ? 'spike' : 'drop'} detected`,
      description: `${token.symbol} moved ${direction} ${worstSwing}. ` +
        `Current price: $${token.price.toFixed(token.price < 0.01 ? 8 : 4)}. ` +
        `Your exposure: $${token.value.toFixed(2)}.`,
      suggestedAction: severity === 'HIGH'
        ? `Consider reducing ${token.symbol} exposure by 30–50% or setting a stop-loss at $${(token.price * 0.9).toFixed(4)}.`
        : `Monitor ${token.symbol} closely. If the move continues, consider trimming 15–20% of your position.`,
      evidence: `1h change: ${(token.change1h ?? 0).toFixed(2)}% | 24h change: ${(token.change24h ?? 0).toFixed(2)}% | Position value: $${token.value.toFixed(2)}`,
      timestamp: new Date().toISOString(),
      walletAddress,
      dismissed: false,
      token: token.symbol,
      scoreDelta: -Math.round(abs1h * 1.5),
    };

    alerts.push(alert);
    store.addAlert(alert);
  }

  return alerts;
}
