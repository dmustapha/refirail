## Chain DNA: Sui

**Unique capabilities:**
- **Object-centric model** — assets are owned objects, not balances in a global contract. Parallel execution, true ownership, cheap composable transfers, no global-state bottleneck.
- **Move (Sui flavor)** — resource safety at the language level; assets can't be double-spent or accidentally destroyed.
- **Native primitives that don't exist (or are worse) elsewhere:**
  - **DeepBook v3** — a *shared*, L1-native central limit order book. $17B cumulative volume, 390ms on-chain settlement, 20+ apps, flash loans, DEEP staking for fee discounts. Primitives: Spot, Margin (live/launching), **Predict**. Ships **NO end-user UI** — builders must create their own. Liquidity is a public good, not a per-DEX silo.
  - **Walrus** — decentralized blob storage with **on-chain proofs of availability**. Quilt (bundle ≤660 small files into one storage unit), Seal (threshold encryption + on-chain access policy), TS SDK + Upload Relay. 200+ projects. "Verifiable big data" no EVM L1 offers natively.
  - **Seal** — native threshold encryption with on-chain key-access policy. Private, decentralized, access-controlled data.
  - **zkLogin** — Google/Apple social login → Sui address. No seed phrase. Consumer-grade onboarding.
  - **PTBs (programmable transaction blocks)** — chain many calls atomically in one tx. Rich per-transaction composability.
  - **Nautilus** — verifiable off-chain compute (TEE / AWS Nitro). TEE-oracle pattern (used by 2025 winner Sui Sentinel).

**Founding thesis:** A horizontally-scalable L1 where assets are owned objects — enabling parallel execution, true asset ownership, and Web2-grade UX (zkLogin, sponsored tx) without a global contract bottleneck.

**Community builds:** prediction markets (breakout 2026 theme — Myriad, DeepBook Predict, WaterX World Cup), AI agents (Agentic Web — Talus, Beep, Atoma), verifiable-data apps on Walrus (Team Liquid, Alkimi, Allium), DeFi/trading on DeepBook, consumer apps via zkLogin.

**Path of least resistance:** `@mysten/dapp-kit` (React hooks + wallet) + `@mysten/sui` TS SDK + zkLogin → polished frontend fast. Plug into DeepBook's **live shared liquidity** (no need to build a matching engine). Store/retrieve via Walrus TS SDK. Write the **thinnest possible custom Move** on top. This is the only viable 3-day shape.

**Honest constraints:**
- **Move learning curve is real** — experienced Solidity devs report weeks to be productive; Sui's object model adds more on top. In 3 days, net-new Move must be minimal.
- **Tooling/docs immature** — IDEs, debuggers, tutorials still evolving. Budget setup/debug buffer.
- **DeepBook ships no UI** — both a constraint and an opportunity.
- **Walrus docs flaky** (403/timeout during intel) — use the TS SDK + known patterns, not live doc-reading at build time.

**Top community frustrations:**
1. **Move ramp-up** → lean on SDKs (dapp-kit, DeepBook SDK, Walrus TS SDK), not net-new Move.
2. **Tooling/doc immaturity** → prefer well-trodden paths (dapp-kit starter, zkLogin).
3. **DeepBook has no end-user UI** → a polished consumer front end over DeepBook's live liquidity (Margin/Predict) is high-value AND 3-day-feasible.
