// ─── Token & Wallet Positions ─────────────────────────────────────────────────

export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  price: number;
  value: number;
  change24h: number;
  change1h?: number;
  logoURI?: string;
}

export interface LPPosition {
  protocol: string;
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  lpValue: number;
  tokenAAmount: number;
  tokenBAmount: number;
  poolShare: number;
  estimatedIL: number;
  change24h: number;
  reserveRatio: number;
  previousReserveRatio?: number;
  apy?: number;
}

export interface StakingPosition {
  protocol: string;
  token: string;
  symbol: string;
  stakedAmount: number;
  value: number;
  apy: number;
  lockupEnd?: string;
  change24h: number;
}

export interface WalletPosition {
  address: string;
  tokens: TokenBalance[];
  lpPositions: LPPosition[];
  stakingPositions: StakingPosition[];
  totalValue: number;
  lastUpdated: string;
  recentTransactions?: TransactionRecord[];
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export interface PortfolioSnapshot {
  walletAddresses: string[];
  totalValue: number;
  change24h: number;
  change24hPercent: number;
  healthScore: number;
  positions: WalletPosition[];
  riskFactors: RiskFactors;
  timestamp: string;
}

export interface RiskFactors {
  volatilityScore: number;        // 0-100, lower = riskier
  lpHealthScore: number;          // 0-100, lower = riskier
  contractRiskScore: number;      // 0-100, lower = riskier
  concentrationScore: number;     // 0-100, lower = riskier
  suspiciousActivityScore: number;// 0-100, lower = riskier
  overall: number;                // weighted composite 0-100
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertType =
  | 'VOLATILITY'
  | 'LP_HEALTH'
  | 'CONTRACT_RISK'
  | 'CONCENTRATION'
  | 'ANOMALY';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  description: string;
  suggestedAction: string;
  evidence: string;
  timestamp: string;
  walletAddress: string;
  dismissed: boolean;
  protocol?: string;
  token?: string;
  scoreDelta?: number; // how much health score dropped due to this
}

// ─── Risk Scoring ─────────────────────────────────────────────────────────────

export type RiskLabel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';

export interface RiskScore {
  address: string;
  protocol: string;
  positionType: 'TOKEN' | 'LP' | 'STAKING';
  overallScore: number;           // 0-100
  volatilityScore: number;
  liquidityScore: number;
  contractScore: number;
  concentrationScore: number;
  label: RiskLabel;
  reasons: string[];
}

export interface PositionRisk {
  id: string;
  name: string;
  protocol: string;
  positionType: 'TOKEN' | 'LP' | 'STAKING';
  value: number;
  change24h: number;
  riskScore: number;
  riskLabel: RiskLabel;
  reasons: string[];
}

// ─── Rebalance Suggestions ────────────────────────────────────────────────────

export interface RebalanceSuggestion {
  action: 'REDUCE' | 'INCREASE' | 'HOLD' | 'EXIT';
  asset: string;
  protocol: string;
  reason: string;
  urgency: 'IMMEDIATE' | 'SOON' | 'OPTIONAL';
  targetReductionPct?: number;
}

// ─── Daily Brief ──────────────────────────────────────────────────────────────

export interface DailyBrief {
  date: string;
  healthScore: number;
  topRisks: string[];
  alertsSummary: string;
  recommendedActions: RebalanceSuggestion[];
  insight: string;
}

// ─── Price Data ───────────────────────────────────────────────────────────────

export interface PriceData {
  mint: string;
  symbol?: string;
  price: number;
  change1h: number;
  change24h: number;
  confidence: 'high' | 'medium' | 'low';
  updatedAt: string;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export interface TransactionRecord {
  signature: string;
  timestamp: string;
  programs: string[];
  type: string;
  status: 'success' | 'failed';
  knownProgram: boolean;
}

// ─── Agent State ──────────────────────────────────────────────────────────────

export interface AgentState {
  watchedWallets: string[];
  lastSnapshot: PortfolioSnapshot | null;
  alerts: Alert[];
  previousSnapshots: PortfolioSnapshot[];
  priceHistory: Record<string, PriceData[]>;
  isRunning: boolean;
  nosanaJobId?: string;
  startedAt: string;
  lastSyncAt?: string;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthStatus {
  status: 'running' | 'degraded' | 'failed';
  version: string;
  uptime: number;
  watchedWallets: number;
  lastSync?: string;
  nosanaJobId?: string;
  runtimeStarted?: boolean;
  elizaRuntimeActive?: boolean;
  elizaStartupError?: string;
  heliusConfigured?: boolean;
  registeredPlugins?: string[];
  registeredClients?: string[];
  pluginPackage?: string;
}

// ─── Chat / Orion Assistant ──────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  suggestedReplies: string[];
}
