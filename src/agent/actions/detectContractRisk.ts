/**
 * Action: detectContractRisk
 *
 * Detects wallet interactions with unknown or suspicious programs.
 * Cross-references recent transactions against a trusted program whitelist.
 */

import { v4 as uuidv4 } from 'uuid';
import { store } from '../store';
import type { Alert, TransactionRecord } from '../../shared/types';

const TRUSTED_PROGRAM_NAMES: Record<string, string> = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: 'Jupiter v6',
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB:  'Jupiter v4',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc:   'Orca Whirlpool',
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK:  'Raydium CLMM',
  MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD:   'Marinade',
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA:   'SPL Token',
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1brs:  'Associated Token',
  '11111111111111111111111111111111':              'System Program',
  So11111111111111111111111111111111111111112:     'Wrapped SOL',
  ComputeBudget111111111111111111111111111111:     'Compute Budget',
};

const TRUSTED_SET = new Set(Object.keys(TRUSTED_PROGRAM_NAMES));

export function detectContractRiskAnomalies(walletAddress: string): Alert[] {
  const snapshot = store.getSnapshot();
  if (!snapshot) return [];

  const wallet = snapshot.positions.find(p => p.address === walletAddress)
    ?? snapshot.positions[0];
  if (!wallet?.recentTransactions?.length) return [];

  const alerts: Alert[] = [];
  const unknownPrograms = new Map<string, TransactionRecord[]>();

  // Collect unknown program interactions from recent 24h
  for (const tx of wallet.recentTransactions) {
    const txAge = Date.now() - new Date(tx.timestamp).getTime();
    if (txAge > 24 * 60 * 60_000) continue; // only last 24h

    for (const program of tx.programs) {
      if (!TRUSTED_SET.has(program)) {
        if (!unknownPrograms.has(program)) {
          unknownPrograms.set(program, []);
        }
        unknownPrograms.get(program)!.push(tx);
      }
    }
  }

  if (unknownPrograms.size === 0) return [];

  // Generate one alert summarising all unknown interactions
  const programList = [...unknownPrograms.keys()];
  const totalInteractions = [...unknownPrograms.values()].reduce((s, txs) => s + txs.length, 0);
  const topPrograms = [...unknownPrograms.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)
    .map(([program, txs]) => `${program.slice(0, 8)}... (${txs.length})`);
  const remainingPrograms = Math.max(0, unknownPrograms.size - topPrograms.length);
  const severity = unknownPrograms.size >= 3 || totalInteractions >= 5 ? 'HIGH'
                 : unknownPrograms.size >= 2 || totalInteractions >= 2 ? 'MEDIUM'
                 : 'LOW';

  const alert: Alert = {
    id: uuidv4(),
    severity,
    type: 'CONTRACT_RISK',
    title: `Interaction with ${unknownPrograms.size} unrecognised program${unknownPrograms.size > 1 ? 's' : ''} detected`,
    description:
      `Your wallet interacted ${totalInteractions} time${totalInteractions > 1 ? 's' : ''} with ` +
      `${unknownPrograms.size} program${unknownPrograms.size > 1 ? 's' : ''} not on Orion's trusted list ` +
      `in the last 24 hours. Unknown programs can indicate phishing, rugpulls, or unaudited contracts.`,
    suggestedAction:
      `Review the transactions below and verify you authorised each one. ` +
      `If any interaction looks unfamiliar, revoke token approvals immediately via revoke.cash.`,
    evidence:
      `Unknown programs: ${topPrograms.join(', ')}` +
      `${remainingPrograms > 0 ? `, +${remainingPrograms} more` : ''} ` +
      `| Total interactions: ${totalInteractions}`,
    timestamp: new Date().toISOString(),
    walletAddress,
    dismissed: false,
    scoreDelta: -Math.round(unknownPrograms.size * 8 + totalInteractions * 3),
  };

  alerts.push(alert);
  store.addAlert(alert);

  return alerts;
}
