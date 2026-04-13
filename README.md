# ⭐ Orion — Solana DeFi Risk Officer

> Personal AI agent that monitors your Solana DeFi positions, scores portfolio health, detects anomalies, and sends plain-English alerts — running 24/7 on **Nosana** via **ElizaOS**.

[![Built with ElizaOS](https://img.shields.io/badge/Built%20with-ElizaOS-7c6df7?style=flat-square)](https://elizaos.ai)
[![Deployed on Nosana](https://img.shields.io/badge/Deployed%20on-Nosana-00d4aa?style=flat-square)](https://nosana.com)
[![Solana](https://img.shields.io/badge/Chain-Solana-9945FF?style=flat-square)](https://solana.com)

---

## What is Orion?

Orion is a personal Solana DeFi risk officer built with ElizaOS and deployed on Nosana. It monitors wallet balances and DeFi positions across the Solana ecosystem, scores overall portfolio health, and detects anomalies before they become losses.

Instead of showing users raw on-chain noise, Orion translates volatility spikes, liquidity-pool changes, and suspicious contract interactions into plain-English alerts with suggested actions. A background monitoring service runs continuously on Nosana, recalculating risk scores every 60 seconds and triggering alerts when portfolio conditions change.

**Core user promise:** Connect your wallet → Orion tracks your DeFi exposure → you get alerts like _"Your Raydium LP position dropped to a 44/100 health score because pool balance shifted sharply and SOL volatility increased. Suggested: reduce exposure by 20–30%."_

---

## Features

| Feature | Status |
|---|---|
| Wallet monitoring (paste-address) | ✅ |
| Portfolio health score (0–100) | ✅ |
| Position-level risk scores | ✅ |
| Volatility anomaly detector | ✅ |
| LP health / impermanent-loss detector | ✅ |
| Contract interaction risk detector | ✅ |
| Plain-English alert feed | ✅ |
| Telegram notifications | ✅ |
| Daily risk brief | ✅ |
| Rebalance suggestions | ✅ |
| Nosana deployment | ✅ |
| ElizaOS agent architecture | ✅ |

---

## Architecture

```
┌──────────────────────────────────────────┐
│           Next.js App Router UI          │
│  /dashboard  /chat  /health              │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│      Next Route Handlers / API Layer     │
│ /api/portfolio /api/alerts /api/chat     │
│ /api/analyze /api/health                 │
└──────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐   ┌──────────────────┐
│ Orion / ElizaOS   │   │ In-Memory Store │
│ runtime bootstrap │   │ wallets, alerts │
└──────────────────┘   └──────────────────┘
         │                    │
         └────────┬───────────┘
                  ▼
┌──────────────────────────────────────────┐
│ Background workers (same process)        │
│ portfolioSync · monitor · alert · brief  │
└──────────────────────────────────────────┘
```

See [`docs/architecture.md`](docs/architecture.md) for the full component diagram and file layout.

The `/api/health` response includes runtime status fields so you can verify the singleton agent bootstrap during deployment and local dev.

---

## Risk Model

Orion uses a transparent, deterministic risk model. Every score is explainable.

**Portfolio Health Score** = weighted composite of five factors:

| Factor | Weight | What it measures |
|---|---|---|
| Volatility exposure | 25% | Price swing magnitude for held tokens |
| LP / impermanent loss | 25% | Pool imbalance + IL severity |
| Contract risk | 20% | Unknown/unaudited program interactions |
| Concentration | 15% | Herfindahl-Hirschman Index of allocation |
| Suspicious activity | 15% | Failed txs with unknown programs |

**Score bands:**
- 85–100 → 🟢 Low Risk
- 70–84 → 🟡 Moderate  
- 50–69 → 🟠 Elevated
- 0–49 → 🔴 High Risk

See [`docs/scoring-model.md`](docs/scoring-model.md) for full detail.

---

## Setup

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Docker (for deployment)

### Local (live mode)

```bash
cp .env.example .env
# Fill in HELIUS_API_KEY and optionally TELEGRAM credentials
# Set WATCHED_WALLETS=<your-solana-address>
npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API port (default: 3000) |
| `SECRET_SALT` | For ElizaOS | Required in production for encrypted settings |
| `HELIUS_API_KEY` | For live data | Wallet balances + transaction history |
| `SOLANA_RPC_URL` | For live data | Helius-powered RPC endpoint |
| `JUPITER_API_BASE` | Auto | `https://lite-api.jup.ag` |
| `JUPITER_PRICE_API` | Auto | Jupiter Price v3 endpoint |
| `JUPITER_PORTFOLIO_API` | Optional | Jupiter Portfolio beta API |
| `TELEGRAM_BOT_TOKEN` | For alerts | BotFather token |
| `TELEGRAM_CHAT_ID` | For alerts | Chat/channel ID |
| `WATCHED_WALLETS` | Optional | Comma-separated wallet addresses |

---

## Running Locally

```bash
# Development (hot reload)
npm run dev

# Production build
npm run build
npm start
```

---

## Deploying to Nosana

### 1. Build and push Docker image

```bash
docker build -t yourdockerhub/orion-risk-officer:latest .
docker push yourdockerhub/orion-risk-officer:latest
```

### 2. Deploy via Nosana Dashboard

1. Go to [app.nosana.com](https://app.nosana.com)
2. Create a new job → select **Web Service**
3. Set image: `yourdockerhub/orion-risk-officer:latest`
4. Set port: `3000`
5. Add environment variables from `.env`
6. Deploy → copy the Job ID

### 3. Record Nosana Job ID

Set `NOSANA_JOB_ID=<your-job-id>` in your env. Orion will display it in the health endpoint and UI badge.

---

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Agent liveness + Nosana job info |
| `/api/portfolio` | GET | Latest portfolio snapshot |
| `/api/portfolio/positions` | GET | Position-level risk scores |
| `/api/portfolio/suggestions` | GET | Rebalance suggestions |
| `/api/portfolio/watch` | POST | Add wallet address |
| `/api/portfolio/brief` | GET | Daily risk brief |
| `/api/alerts` | GET | All active alerts |
| `/api/alerts/:id/dismiss` | POST | Dismiss an alert |
| `/api/analyze` | POST | On-demand wallet analysis |
| `/api/chat` | POST | Orion chat response with live context |

---

## Roadmap

- [ ] Daily briefing push to Telegram
- [ ] User risk profile presets (conservative / moderate / aggressive)
- [ ] Whale wallet watch mode
- [ ] Manual "analyze this token" chat interface
- [ ] Historical score trend chart
- [ ] Multi-chain support (after Solana validation)

---

## Limitations

- Jupiter Portfolio API is in beta — endpoint behavior may change and should be monitored
- Risk model is rule-based v1 — no ML or predictive scoring yet
- Maximum 10 watched wallets per agent instance
- Price history is in-memory only — resets on restart

---

## Built With

- [ElizaOS](https://elizaos.ai) — Agent orchestration framework
- [Nosana](https://nosana.com) — Decentralized job deployment
- [Helius](https://helius.dev) — Solana RPC + DAS API
- [Jupiter](https://jup.ag) — Price API v3 + Portfolio API
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) — Chain connectivity
- [Next.js](https://nextjs.org/) App Router — Frontend dashboard, chat UI, and API routes
- [Tailwind CSS](https://tailwindcss.com/) — UI utility styling
