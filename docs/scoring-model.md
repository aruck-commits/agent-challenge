# Orion Risk Scoring Model

## Overview

Orion computes a deterministic, fully explainable Portfolio Health Score from 0 to 100. Higher score = healthier, lower risk. Every number traces back to a concrete observable data point — no black-box AI scoring.

## Score Bands

| Score | Label | Meaning |
|---|---|---|
| 85–100 | 🟢 Low Risk | Portfolio is well-balanced, no significant exposure |
| 70–84 | 🟡 Moderate | Some elevated factors — monitor closely |
| 50–69 | 🟠 Elevated | Action may be needed; review alerts |
| 0–49 | 🔴 High Risk | Immediate review strongly recommended |

## Composite Health Score Formula

```
Health Score =
  volatilityScore × 0.25
  + lpHealthScore × 0.25
  + contractRiskScore × 0.20
  + concentrationScore × 0.15
  + suspiciousActivityScore × 0.15
```

All factor scores are 0–100 (higher = safer). The composite is clamped to [0, 100].

---

## Factor 1: Volatility Exposure (25%)

**What it measures:** Average absolute price change across all held tokens, weighted by 1h and 24h movement.

**Formula:**
```
penaltyPerToken = min(50, abs(change24h) × 1.5 + abs(change1h) × 3)
volatilityScore = 100 − avg(penaltyPerToken across all tokens)
```

**Examples:**
- SOL flat (0% change) → penalty: 0 → contributes 100
- JUP +12% in 24h, +3.4% in 1h → penalty: min(50, 18 + 10.2) = 28.2 → contributes 71.8
- BONK -30% in 24h → penalty: 45 → contributes 55

**Alert threshold:** 1h change > ±10% or 24h change > ±20%

---

## Factor 2: LP / Impermanent-Loss Health (25%)

**What it measures:** Pool reserve imbalance, estimated impermanent loss, and rapid reserve shifts.

**Formula:**
```
ilPenalty        = min(40, IL_percent × 5)
imbalancePenalty = |reserveRatio − 0.5| × 2 × 30   (0–30 pts)
shiftPenalty     = min(20, |ratio − prevRatio| × 100)
lpHealthScore    = 100 − avg(ilPenalty + imbalancePenalty + shiftPenalty)
```

**Examples (Raydium RAY-SOL LP):**
- Balanced pool (50/50), IL 1% → penalty: 5 + 0 + 0 = 5 → score: 95
- Shifted pool (31/69), IL 4.2%, reserve moved 19pp → penalty: 21 + 14.4 + 15.2 = 50.6 → score: 49.4

**Alert thresholds:**
- Reserve shift > 15pp → LP anomaly alert
- IL > 5% → IL alert

---

## Factor 3: Contract / Protocol Risk (20%)

**What it measures:** Unknown or unaudited smart program interactions in recent transactions.

**Formula:**
```
unknownCount = count of unique unknown programs in last 20 txs
penalty      = min(70, unknownCount × 7)
contractRiskScore = max(30, 100 − penalty)
```

**Trusted program whitelist includes:** Jupiter v4/v6, Raydium AMM/CLMM, Orca Whirlpool, Marinade, SPL Token, Associated Token, System Program, Compute Budget.

**Alert threshold:** Any unknown program interaction in last 24h

---

## Factor 4: Concentration Risk (15%)

**What it measures:** Herfindahl-Hirschman Index (HHI) of portfolio allocation. A portfolio where 80% is in one asset is far riskier than an evenly spread one.

**Formula:**
```
shares         = [position_value / total_value for each position]
HHI            = sum(share²)
concentrationScore = min(100, (1 − HHI) × 110)
```

**Examples:**
- 5 equal positions (20% each) → HHI = 0.20 → score ≈ 88
- One asset = 80% → HHI ≈ 0.65 → score ≈ 38

**Alert threshold:** Single asset > 40% of portfolio

---

## Factor 5: Suspicious Activity (15%)

**What it measures:** Failed transactions involving unknown programs, or transactions with multiple unrecognised programs.

**Formula:**
```
suspiciousCount += 2 per failed tx with unknown program
suspiciousCount += 1 per tx with >2 unknown programs
penalty = min(60, suspiciousCount × 10)
suspiciousActivityScore = max(40, 100 − penalty)
```

---

## Position-Level Scores

Each individual position also gets a risk score 0–100:

| Position Type | Key Factors |
|---|---|
| Token | % price move (1h + 24h) + portfolio concentration |
| LP | Estimated IL + reserve imbalance + reserve shift speed |
| Staking | Lockup duration + APY sustainability |

---

## Example Score Walkthrough

**Portfolio:** 1 SOL wallet, 1 Raydium RAY-SOL LP, 1 JUP staking position

| Factor | Raw | Score |
|---|---|---|
| Volatility (SOL −3.2%, JUP +12.1%, BONK −8.4%) | avg penalty 22 | **78** |
| LP Health (IL 4.2%, ratio 31/69, shift 19pp) | penalty 50.6 | **49** |
| Contract Risk (1 unknown interaction) | penalty 7 | **93** |
| Concentration (6 positions, SOL 22%) | HHI ≈ 0.21 | **86** |
| Suspicious Activity (0 suspicious txs) | penalty 0 | **100** |

**Composite:** `78×0.25 + 49×0.25 + 93×0.20 + 86×0.15 + 100×0.15`
= `19.5 + 12.25 + 18.6 + 12.9 + 15 = **78.25 → 78/100 (Moderate)**`
