# Orion System Architecture

## Overview

Orion runs as a single Docker container that combines the Next.js app, API route handlers, and the Orion/Eliza runtime in one process boundary.

1. **Next.js App Router UI** - dashboard, chat, and health pages
2. **Next.js Route Handlers** - portfolio, alerts, analysis, chat, and health APIs
3. **Orion runtime** - ElizaOS character, providers, actions, and in-memory store
4. **Background services** - cron-based portfolio sync, monitoring, alerting, and daily brief jobs
5. **Shared model layer** - deterministic risk types and scoring utilities

## Component Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Docker Container                             │
│                                                                      │
│  ┌──────────────────────────────┐   HTTP   ┌──────────────────────┐  │
│  │          Next.js UI          │◄───────► │  Next Route Handlers  │  │
│  │  app/dashboard               │          │  /api/portfolio      │  │
│  │  app/chat                    │          │  /api/portfolio/*    │  │
│  │  app/health                  │          │  /api/alerts         │  │
│  │  components/*                │          │  /api/analyze        │  │
│  │  features/*                  │          │  /api/chat           │  │
│  │  lib/api.ts                  │          │  /api/health         │  │
│  └──────────────────────────────┘          └─────────┬────────────┘  │
│                                                       │               │
│                                                       ▼               │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                     Orion / ElizaOS Runtime                      │  │
│  │                                                                 │  │
│  │  Character: Orion                                               │  │
│  │  Providers: helius · jupiterPrice · jupiterPortfolio · wallet   │  │
│  │  Actions: analyzePortfolio · detectVolatilityAnomaly ·          │  │
│  │           detectLiquidityAnomaly · detectContractRisk ·         │  │
│  │           scorePortfolioRisk · suggestRebalance                 │  │
│  └──────────┬──────────────────────────────────┬───────────────────┘  │
│             │                                  │                      │
│  ┌──────────▼──────────┐          ┌────────────▼──────────────┐      │
│  │   Background Jobs   │          │      In-Memory Store      │      │
│  │                     │          │                           │      │
│  │  portfolioSync: 60s │◄────────►│  watchedWallets           │      │
│  │  monitor: 30s       │          │  lastSnapshot             │      │
│  │  alertDispatch      │          │  alerts[]                 │      │
│  │  dailyBrief: 08:00  │          │  priceHistory             │      │
│  └─────────────────────┘          └───────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘

External APIs used by the runtime:
- Helius RPC - wallet balances and transaction history
- Jupiter Price - token prices
- Jupiter Portfolio - LP positions and staking
- Telegram API - alert notifications
```

## Data Flow

1. The UI loads a Next App Router page and mounts the shared providers.
2. Client components call the local `/api/*` route handlers through `src/ui/src/lib/api.ts`.
3. Route handlers call `ensureOrionRuntime()` so the runtime and services start once per process.
4. `store.addWallet()` triggers an immediate portfolio sync.
5. `portfolioSyncService` refreshes wallet, token, and LP data and writes the latest snapshot.
6. `monitorService` reads the latest snapshot, runs the detectors, and writes alerts into the store.
7. `alertService` and `dailyBriefService` publish Telegram alerts and summaries.
8. The UI polls periodically while the tab is visible and re-renders from the live store-backed API.

## File Structure

```
orion/
├── src/
│   ├── agent/
│   │   ├── index.ts               ← Legacy bootstrap shim for compatibility
│   │   ├── character.ts           ← ElizaOS character definition
│   │   ├── store.ts               ← Singleton in-memory state
│   │   ├── elizaRuntime.ts        ← Orion runtime bootstrap for Next route handlers
│   │   ├── providers/
│   │   │   ├── heliusProvider.ts
│   │   │   ├── jupiterPriceProvider.ts
│   │   │   ├── jupiterPortfolioProvider.ts
│   │   │   ├── walletProvider.ts
│   │   ├── actions/
│   │   │   ├── analyzePortfolio.ts
│   │   │   ├── detectVolatilityAnomaly.ts
│   │   │   ├── detectLiquidityAnomaly.ts
│   │   │   ├── detectContractRisk.ts
│   │   │   ├── scorePortfolioRisk.ts
│   │   │   └── suggestRebalance.ts
│   │   ├── services/
│   │   │   ├── portfolioSyncService.ts
│   │   │   ├── monitorService.ts
│   │   │   ├── alertService.ts
│   │   │   └── dailyBriefService.ts
│   ├── ui/
│   │   ├── next.config.mjs
│   │   ├── next-env.d.ts
│   │   └── src/
│   │       ├── app/               ← App Router pages + Route Handlers
│   │       ├── components/        ← UI widgets and panels
│   │       ├── features/          ← Dashboard, chat, and health shells
│   │       ├── views/             ← Chat page composition
│   │       ├── lib/               ← API client + server bootstrap helpers
│   │       └── globals.css        ← Tailwind entry stylesheet
│   └── shared/
│       ├── types.ts               ← Shared TypeScript types
│       └── risk.ts                ← Deterministic risk model
├── Dockerfile
├── docker-compose.yml
└── docs/
```

## Current Notes

- `src/agent/routes/` is no longer used; API routes now live in `src/ui/src/app/api/`.
- The UI styling system is now Tailwind-based, with a small amount of shared global CSS for base tokens.
- `src/ui/out/` is generated build output and is not part of the source architecture.
