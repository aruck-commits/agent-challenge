/**
 * Orion In-Memory State Store
 *
 * Singleton store shared by providers, services, and routes.
 * In production this could be replaced by Redis; for hackathon
 * simplicity we use an in-memory EventEmitter-backed store.
 */

import { EventEmitter } from 'events';
import type { AgentState, Alert, PortfolioSnapshot, PriceData } from '../shared/types';

class OrionStore extends EventEmitter {
  private state: AgentState = {
    watchedWallets: [],
    lastSnapshot: null,
    alerts: [],
    previousSnapshots: [],
    priceHistory: {},
    isRunning: false,
    startedAt: new Date().toISOString(),
  };

  // ─── Wallets ────────────────────────────────────────────────────────────────

  getWatchedWallets(): string[] {
    return [...this.state.watchedWallets];
  }

  addWallet(address: string): boolean {
    if (this.state.watchedWallets.includes(address)) return false;
    this.state.watchedWallets.push(address);
    this.emit('wallet:added', address);
    console.log(`[Store] Added wallet: ${address}`);
    return true;
  }

  removeWallet(address: string): boolean {
    const idx = this.state.watchedWallets.indexOf(address);
    if (idx === -1) return false;
    this.state.watchedWallets.splice(idx, 1);
    this.emit('wallet:removed', address);
    return true;
  }

  // ─── Snapshots ──────────────────────────────────────────────────────────────

  getSnapshot(): PortfolioSnapshot | null {
    return this.state.lastSnapshot;
  }

  setSnapshot(snapshot: PortfolioSnapshot): void {
    if (this.state.lastSnapshot) {
      this.state.previousSnapshots.unshift(this.state.lastSnapshot);
      // Keep last 10 snapshots for trend analysis
      this.state.previousSnapshots = this.state.previousSnapshots.slice(0, 10);
    }
    this.state.lastSnapshot = snapshot;
    this.state.lastSyncAt = snapshot.timestamp;
    this.emit('snapshot:updated', snapshot);
  }

  getPreviousSnapshot(): PortfolioSnapshot | null {
    return this.state.previousSnapshots[0] ?? null;
  }

  // ─── Alerts ─────────────────────────────────────────────────────────────────

  getAlerts(includesDismissed = false): Alert[] {
    const alerts = includesDismissed
      ? this.state.alerts
      : this.state.alerts.filter(a => !a.dismissed);

    // Return newest first, last 50
    return alerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  }

  getAlertById(id: string): Alert | null {
    return this.state.alerts.find(alert => alert.id === id) ?? null;
  }

  addAlert(alert: Alert): void {
    // Deduplicate: skip if same type+wallet alert fired in last 5 minutes
    const fiveMinAgo = Date.now() - 5 * 60_000;
    const duplicate = this.state.alerts.find(
      a =>
        a.type === alert.type &&
        a.walletAddress === alert.walletAddress &&
        !a.dismissed &&
        new Date(a.timestamp).getTime() > fiveMinAgo,
    );
    if (duplicate) return;

    this.state.alerts.unshift(alert);
    // Keep last 200 alerts
    this.state.alerts = this.state.alerts.slice(0, 200);
    this.emit('alert:new', alert);
    console.log(`[Store] New alert [${alert.severity}]: ${alert.title}`);
  }

  dismissAlert(id: string): boolean {
    const alert = this.state.alerts.find(a => a.id === id);
    if (!alert) return false;
    alert.dismissed = true;
    return true;
  }

  // ─── Price History ───────────────────────────────────────────────────────────

  getPriceHistory(mint: string, limit = 60): PriceData[] {
    return (this.state.priceHistory[mint] ?? []).slice(0, limit);
  }

  addPricePoint(data: PriceData): void {
    if (!this.state.priceHistory[data.mint]) {
      this.state.priceHistory[data.mint] = [];
    }
    this.state.priceHistory[data.mint].unshift(data);
    // Keep last 120 price points per token (≈1h at 30s intervals)
    this.state.priceHistory[data.mint] = this.state.priceHistory[data.mint].slice(0, 120);
  }

  // ─── Agent State ─────────────────────────────────────────────────────────────

  isRunning(): boolean {
    return this.state.isRunning;
  }

  setRunning(running: boolean): void {
    this.state.isRunning = running;
    this.emit('agent:status', running);
  }

  getLastSyncAt(): string | undefined {
    return this.state.lastSyncAt;
  }

  setNosanaJobId(jobId: string): void {
    this.state.nosanaJobId = jobId;
  }

  getNosanaJobId(): string | undefined {
    return this.state.nosanaJobId;
  }

  getStartedAt(): string {
    return this.state.startedAt;
  }
}

// Singleton export
export const store = new OrionStore();
