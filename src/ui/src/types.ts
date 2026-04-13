// UI-facing type aliases (mirrors shared/types.ts but re-exported for frontend use)

export type { 
  TokenBalance,
  LPPosition,
  StakingPosition,
  WalletPosition,
  PortfolioSnapshot,
  RiskFactors,
  Alert,
  AlertSeverity,
  AlertType,
  RiskScore,
  RiskLabel,
  PositionRisk,
  RebalanceSuggestion,
  DailyBrief,
  PriceData,
  TransactionRecord,
  AgentState,
  ApiResponse,
  HealthStatus,
  ChatMessage,
  ChatRequest,
  ChatResponse,
} from '../../shared/types';

export interface TelegramStatus {
  botConfigured: boolean;
  chatConfigured: boolean;
  connectUrl?: string;
  runtimeConnected?: boolean;
  connectedUser?: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface TelegramConnectSession {
  sessionId: string;
  connectUrl: string;
}

export interface TelegramConnectSessionStatus {
  connected: boolean;
  expired?: boolean;
  user?: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}
