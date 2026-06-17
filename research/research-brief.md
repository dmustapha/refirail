# Sui Overflow 2026 — Research Brief
**Compiled:** 2026-06-17
**Intel Depth:** ID 8 (Deep) — deepened on request; ~20 searches/fetches across 2024+2025 editions, both specialized tracks, AI incumbents, roadmap. Social: web/analyst-sourced (live paid X scrape blocked by $0 wallet)
**Sources:** DeepSurge API, overflow.sui.io, Sui blog (2025 winners), Sui docs, web search

---

## ⚠️ CRITICAL: DEADLINE REALITY CHECK

**BOTTOM LINE:** Only **~3 days remain**. Today is 2026-06-17; submission deadline is **2026-06-20 16:00 UTC**. The build period opened **May 7, 2026** — competitors have had ~6 weeks.
**EVIDENCE:** DeepSurge API `endingDate: 2026-06-20T16:00:00.000Z`, `startingDate: 2026-05-07` [B2]; web search confirms "build period May 7 – June 20" [C2].
**CONFIDENCE:** High on June 20 date (two corroborating sources). The May 23 / June 13–14 dates surfaced in one fetch belong to the **2025** edition (blended by a stale cache).
**SO WHAT:** Any project MUST be scoped to 3 days of build + 1 polished demo. Breadth is impossible. The only viable play is **one sharp, deep, native integration** with a single sponsor primitive — exactly the pattern that won in 2025.

---

## Overview

| Field | Value |
|-------|-------|
| Name | Sui Overflow 2026 |
| Organizer | Sui Foundation / Mysten Labs |
| Platform | DeepSurge (deepsurge.xyz) |
| Build period | May 7 → **June 20, 2026 (16:00 UTC)** |
| Tracks | The Agentic Web (AI), DeFi & Payments, Special–Walrus, Special–DeepBook |
| Prize pool | $500,000+ |
| Chain | Sui (Move language) |
| Native primitives | Walrus (storage), DeepBook (CLOB), Seal (encryption), zkLogin, SuiNS, Nautilus |

### Submission Requirements
- Built on Sui during the build period
- Working prototype / demo
- GitHub repo + demo video (standard; confirm exact length in handbook)
- Submit via DeepSurge project page
- **Multi-track allowed** — see section below

---

## ⭐ Multi-Track Submission Rule (HIGH STRATEGIC VALUE)

**BOTTOM LINE:** One project can compete for **multiple prize pools simultaneously** — a product/core track **+** a Sui technology/specialized track **+** ecosystem bounties.
**EVIDENCE (verbatim, Sui blog [A2]):**
> "Participants can submit a single project under both a product track and a Sui technology track that aligns with their project's goals."
> "hackathon teams can potentially qualify for both track prizes and ecosystem bounties with one submission."
> Example: "a team building a DeFi project utilizing innovative Move features may submit their project under both the DeFi and Move tracks."
**CONFIDENCE:** High that multi-track is allowed; Medium on the exact 2026 product↔technology pairing (wording carries from the original Overflow framing). Confirm pairing in handbook.
**SO WHAT — this is the highest-leverage strategic fact in the brief:** Build ONE focused project that legitimately spans:
- a **core/product track** (Agentic Web *or* DeFi & Payments), AND
- a **technology/specialized track** (Walrus *or* DeepBook).

Best crossovers for a 3-day build:
- **AI trading agent on DeepBook** → Agentic Web (core) + DeepBook (tech). Two $70k-class pools from one build.
- **AI memory / verifiable-data app on Walrus** → Agentic Web (core) + Walrus (tech).
- **Payment/DeFi rail routed through DeepBook** → DeFi & Payments (core) + DeepBook (tech).

One deep build, multiple prize shots, plus any ecosystem bounties it touches.

---

## Demo Video Requirements

| Field | Value |
|-------|-------|
| Max length | Not confirmed (2025 used recorded demos + demo days; assume 2–4 min) |
| Formats | MP4 / YouTube (assumed) |
| Platform | DeepSurge / YouTube |
| Content notes | [ASSUMED] Show working app + Sui-native usage. Confirm in handbook: https://go.sui.io/overflow26-participant-handbook |

---

## Submission Form Fields
*(Standard Sui Overflow / DeepSurge fields — confirm on the DeepSurge project page)*
- Project Name
- Track (select one)
- Description
- GitHub URL
- Demo Video URL
- Team

---

## Disqualifiers
- Project not built on Sui
- Code created before build period start (pre-existing project reuse)
- Wrong-track or multi-track submission (must pick ONE)
- No working demo

---

## Prizes

| Track | Structure | Total |
|-------|-----------|:---:|
| The Agentic Web (AI) | 1st $30k / 2nd $15k / 3rd $10k / 4th $7.5k | $62.5k |
| DeFi & Payments | 1st $30k / 2nd $15k / 3rd $10k / 4th $7.5k (OpenZeppelin + OtterSec prize sponsors) | $62.5k |
| **Special – Walrus** | Specialized track (headline partner) | **$70k** |
| **Special – DeepBook** | Specialized track | **$70k** |
| University Award | $2,500 × ~10 (Scallop) | $25k |
| Community Award | Vote-based (~$25k per 2025 precedent) | ~$25k |

**SO WHAT:** The two specialized tracks (Walrus $70k, DeepBook $70k) are the **largest single pools** and reward *depth on one primitive* — ideal for a 3-day focused build, and judged by sponsors who know their own tech.

---

## Judging Criteria
*(No explicit weights published; derived from Sui's stated principles "originality, technical sophistication, usability, alignment with performance & scalability" + universal hackathon patterns. Marked `derived`.)*

| Criterion | Est. Weight | How to score high |
|-----------|:---:|---|
| Problem–Solution fit / real-world use | 25% | Solve a real problem; "would anyone use this outside the hackathon?" |
| Technical execution (working demo, clean Move) | 25% | Functional end-to-end demo; no crashes |
| Originality / innovation | 20% | Novel combination, not a clone of a 2025 winner |
| Sui-native depth (object model, composability, perf) | 20% | Use Sui primitives meaningfully, not as a generic L1 |
| Usability / UX / presentation | 10% | Polished UI, clear 2-min story |

---

## Workshop Signals
No 2026 workshop schedule captured. Organizer signal is implicit in the track structure: **AI agents** (Agentic Web is now a *core* track, elevated from a sub-track in 2025) and **verifiable data on Walrus** are the headline narratives Sui is pushing.

---

## Tech Deep Dive

- **Language:** Move (Sui flavor). Object-centric model — assets are owned objects, not balances in a contract. Steeper ramp than Solidity; budget setup time.
- **Walrus:** Decentralized blob storage + availability layer; headline partner, deepest leverage point. Dev surface: **blob storage**, **Quilt** (bundle up to 660 small files into one storage unit — kills per-file overhead), **Seal** (native threshold encryption + on-chain access control — "define exactly who can access"), **TypeScript SDK + Upload Relay** (fast uploads in low-connectivity). **200+ projects** already building. [A2]
- **DeepBook (v3):** Sui's native on-chain CLOB and *shared* liquidity layer — any app plugs in instead of building its own book. **LIVE on mainnet**, **$17B cumulative volume**, **390ms on-chain settlement**, **20+ apps** built on it. Dev surface: `Pool` + `PoolRegistry` (shared objects), `BalanceManager` (account abstraction), **PTBs** for trading logic, **DeepBookV3 Indexer** for real-time orderbook data, **flash loans**, **DEEP token** staking for fee discounts. Primitives: **Spot, Margin (live/launching), Predict**. **Critical: DeepBook ships NO end-user UI — builders must create their own** ([A2] docs). Roadmap: Margin + referral income-sharing, perps/structured products. "Bet on any asset with leverage" is the flagship narrative.
- **zkLogin:** Web2 social login → Sui address. Huge UX unlock for consumer apps.
- **Nautilus:** Verifiable off-chain compute (TEE / AWS Nitro) — used by 2025 winner Sui Sentinel.
- **SDKs:** `@mysten/sui` (TS SDK), `@mysten/dapp-kit` (React hooks + wallet), Sui CLI, Move analyzer.
- **Docs:** https://docs.sui.io · Walrus docs · DeepBook docs.

---

## Network / Chain Infrastructure

| Field | Value |
|-------|-------|
| Chain | Sui |
| Network | Mainnet / Testnet |
| RPC | `https://fullnode.mainnet.sui.io:443` · `https://fullnode.testnet.sui.io:443` |
| Testnet | Sui Testnet |
| Faucet | https://faucet.sui.io |
| Deploy requirement | Move package deployed; testnet OK for demo, mainnet = stronger signal |

---

## Ecosystem Products

| Product | Purpose | Integration depth value | Notes |
|---------|---------|:---:|---|
| Walrus | Decentralized blob storage | ⭐⭐⭐⭐⭐ | Headline partner; $70k track |
| DeepBook | On-chain CLOB | ⭐⭐⭐⭐⭐ | Track sponsor; $70k track |
| Seal | Threshold encryption | ⭐⭐⭐⭐ | Pairs with Walrus for private data |
| zkLogin | Social → wallet | ⭐⭐⭐⭐ | UX multiplier for consumer apps |
| Nautilus | Verifiable off-chain compute | ⭐⭐⭐ | TEE oracle pattern |
| SuiNS | Naming | ⭐⭐ | Nice-to-have |

---

## Capability Sheet — what is *uniquely* possible on this stack

- **Owned-object model:** Parallel execution + true asset ownership without a global contract bottleneck — fast, cheap, composable transfers.
- **Walrus:** Store gigabyte-scale data with on-chain proofs of availability — "verifiable big data" no EVM L1 offers natively.
- **DeepBook:** A *shared* L1-native order book any app can plug into — liquidity as a public good, not per-DEX silos.
- **Seal + Walrus:** Encrypted, access-controlled large data with on-chain key policy — private files that are still decentralized.
- **zkLogin:** Passwordless wallet from a Google/Apple login — no seed phrase onboarding.
- **PTBs (programmable transaction blocks):** Chain many calls atomically in one tx — rich composability per transaction.

---

## Competitor Landscape

**BOTTOM LINE:** 2026 submissions are not public yet on DeepSurge, but the 2025 field (599 projects, 85 countries) defines the quality bar and what's already been done.
**CONFIDENCE:** Medium — extrapolating from 2025 winners (strong signal for "already built") rather than live 2026 scouting.

### Competitor Registry (2025 winners = "already built" risk for 2026)
| Project | Track | Threat (as prior art) | Tech | Source | Confidence |
|---------|-------|:---:|---|---|:---:|
| Suithetic | AI | HIGH | LLM synthetic data + marketplace | sui blog [A2] | High |
| OpenGraph | AI | HIGH | ML deploy on Walrus | sui blog [A2] | High |
| Magma Finance | DeFi | HIGH | AI yield abstraction layer | sui blog [A2] | High |
| Pismo Protocol | DeFi | MED | Move-native perps | sui blog [A2] | High |
| SuiSQL | Infra | HIGH | SQL DB on Walrus | sui blog [A2] | High |
| SuiSign | Storage | HIGH | Doc signing on Walrus | sui blog [A2] | High |
| WalGraph | Storage | MED | Graph DB on Sui | sui blog [A2] | High |
| Walpress | Storage | MED | Censorship-resistant site builder on Walrus | sui blog [A2] | High |
| ZeroLeaks | Crypto | MED | Whistleblowing (ZK + Walrus + Seal) | sui blog [A2] | High |
| DeepMaker | University/DeepBook | MED | DeepBook passive liquidity + Pyth | sui blog [A2] | High |
| PIVY | Payments | MED | Stealth-address private payments | sui blog [A2] | High |

### Live 2026 Field Size
**BOTTOM LINE:** ~**178 projects** are registered/submitted on DeepSurge for Sui Overflow 2026 [B2 — DeepSurge projects API returned count `178`].
**SO WHAT:** Crowded but spread across 4 tracks + bounties. Confirms the strategy: avoid the flooded AI/DeFi cores as a *primary* identity, anchor on a low-competition tech track (DeepBook/Walrus), and use multi-track to cover a core track too. Individual project list not exposed by the API (count only) — qualitative scouting needs Telegram/X.

### Competition Density Map (2026 estimate)
| Track | Est. Activity | Density | Rationale |
|-------|---|:---:|---|
| The Agentic Web (AI) | High | **HIGH** | Hottest narrative; everyone builds an "AI agent" |
| DeFi & Payments | High | **HIGH** | Perennial crowd; strong incumbents (Magma, Pismo) |
| Special – Walrus | Medium | **MEDIUM** | Many 2025 winners used Walrus, but track is new/elevated; deep-integration angles open |
| Special – DeepBook | Low–Medium | **LOW–MED** | Narrower skill set (orderbook/trading); fewer teams; **best win-probability/$ ratio** |

### Funded Incumbents — AI / Agentic Web (compete head-on at your peril) [A2]
| Project | What it does | Sui primitives | Note |
|---------|-------------|----------------|------|
| Talus Network (Nexus) | Agents as Sui objects; yield/arb/prediction | Object model, Walrus | Raised $10M+ (Polychain). Runs an accelerator. |
| Surge | AI-agent launchpad / IDO | Cetus DEX | Launched Oct 2025 |
| Beep Protocol | Agentic wallet; LLM-driven DeFi automation | Sub-second settlement | "LLMs directly drive programmable transactions" |
| Atoma Network | TEE inference infra | Nautilus-style TEE | ~48% of Sui DEX volume |
| DeAgent AI | Cross-chain oracle for trustless AI predictions | Multi-chain | Risk assessment/settlement |
**SO WHAT:** A generic "AI agent platform" is dead — these are funded and shipping. An agent must be *narrow + novel + wired to a specific primitive* (DeepBook trading agent, Walrus-memory agent).

### Already Built — DeepBook & Walrus (don't reinvent) [A2]
- **DeepBook ecosystem:** 20+ apps; DeepBook's own **trader-hub** already offers Spot/Margin/Prediction. Generic DEX/orderbook frontends are taken. Opportunity = *novel consumer app on top of Margin/Predict*, not another order book.
- **Walrus apps:** Team Liquid (250TB esports footage), Alkimi (25M ad-impressions/day audit trails), Allium (65TB institutional data, encrypted + AI-agent purchase-unlock), **Myriad (prediction markets, $5M+, verifiable data on Walrus)**. 200+ projects. Generic "store files on Walrus" is taken; opportunity = *verifiable-data + AI or finance* angle.

---

## Community Pain (Quotes)

These are ecosystem-analyst / official-doc sourced (live raw Discord/X verbatim needs paid X scraping — wallet currently $0 — or Telegram access). Tagged accordingly.

1. **Move learning curve** [C3, analyst]: "Move is safer than Solidity but harder to learn… most experienced Solidity developers report it takes a few weeks to become productive in Move, and Sui Move adds the object model on top of that."
   → *SO WHAT:* In 3 days, minimize net-new Move. Lean on SDKs (dapp-kit, DeepBook SDK, Walrus TS SDK) and existing deployed protocols; write the thinnest possible custom Move.
2. **Tooling immaturity** [C3, analyst]: "developer-driven tools such as IDEs, debugging frameworks, and plugins are not as mature… documentation, tutorials, and community-driven learning materials are still evolving."
   → *SO WHAT:* Budget setup/debug buffer; prefer well-trodden paths (dapp-kit starter, zkLogin).
3. **DeepBook has no UI** [A2, official docs]: "DeepBookV3 does not include an end-user interface" — builders must create their own.
   → *SO WHAT:* This is an *opportunity*, not just pain — a polished front end over DeepBook's live liquidity is high-value and 3-day-feasible.

**Gap flagged:** No live 2026 builder-sentiment verbatim from X/Discord/Telegram (paid X scrape blocked by $0 wallet balance). Fund the AgentCash wallet to unlock twit.sh `/tweets/search` ($0.006/call) for live competitor scouting.

---

## Past Editions Analysis (2025)

**BOTTOM LINE:** 2025 had 599 projects across 9 tracks. The single strongest cross-cutting winning pattern was **deep native integration of one Sui primitive — overwhelmingly Walrus.**
**EVIDENCE:** Walrus appears in winners across AI (OpenGraph), Cryptography (ZeroLeaks), Infra (SuiSQL), Storage (SuiSign, WalGraph, Walpress) and university (SuiFL, Chatiwal, Archimeters) [A2].
**SO WHAT:**
1. **Walrus is the most rewarded primitive** — and now has its own $70k track. A focused, novel Walrus app is the highest-EV 3-day play.
2. **AI + verifiability** wins (Suithetic, OpenGraph, Sui Sentinel) — but the AI track is now crowded.
3. **DeepBook is under-built** — only DeepMaker (a *university* project) surfaced. The $70k DeepBook track likely has the thinnest competition.
4. Winners shipped **one polished primitive**, not sprawling platforms.

**2024 edition (first Overflow, 8 tracks):** winners incl. Pandora Finance (prediction market), Hop Aggregator (DEX), AresRPG (game using Sui as sole DB), Kraken (multisig — became a real product), SuiGPT (Move decompiler), Promise (ZK quiz). zkLogin and Advanced Move Features were dedicated tracks — the org rewards *Sui-native depth* and clever Move usage. Several winners (Kraken, SuiGPT, Pandora) matured into ecosystem products — judges reward "built to last beyond the event."

---

## Broader Market Context

- **Prediction markets are the breakout theme on Sui right now** [B2] — recurring across every layer of research: Myriad ($5M+, on Walrus), **WaterX World Cup 2026 predictive campaign (launched June 12, 2026)**, Yoso Social (migrating to Sui w/ prediction markets), **DeepBook Predict**, plus past winners Pandora Finance (2024) and Skepsis (2025). The **FIFA World Cup 2026 is live**, making sports/event prediction extremely timely. Strong thematic candidate for warroom.
- AI agents + crypto convergence is the dominant 2026 narrative; Sui elevated "Agentic Web" to a core track. Roadmap pushes agents via deeper **Nautilus** TEE + external LLMs (Mistral) and ZK-ML in A2A payments.
- "DeepBook App" (leverage trading on any asset) heavily promoted — Sui wants flagship DeepBook consumer apps; **DeepBook Margin is live/launching**.
- Walrus = Sui's verifiable-data/storage layer; verifiable-data + AI-memory is the pitch (200+ projects, Quilt + Seal).

### Sui 2026 Roadmap Signals (what Sui/judges WANT) [B2]
- **S2 "unified developer platform"** vision; protocol-level **private transactions** for B2B/institutional payments.
- **USDsui** — native yield-bearing stablecoin launching 2026.
- DeepBook v3 **Margin + referral income-sharing**; perps/structured products.
- Walrus + Seal for **cross-chain data tokenization** and federated learning.
- Building anything aligned to these gets political tailwind from sponsor judges.

---

## Category Saturation (Grid Data)
Grid/Copilot ecosystem queries not run this session (time-boxed; Sui is outside the Solana-focused Grid corpus). Saturation estimated from 2025 track distribution above. **DeepBook = lowest saturation; AI = highest.**

---

## Key Links & Resources
| Resource | URL |
|----------|-----|
| Official site | https://overflow.sui.io/ |
| DeepSurge listing | https://www.deepsurge.xyz/hackathons/b587dc0c-4cb8-4e63-ada5-519df38103bf |
| Participant handbook | https://go.sui.io/overflow26-participant-handbook |
| Telegram | https://go.sui.io/suioverflow2026-tg |
| Sui docs | https://docs.sui.io |
| 2025 winners | https://blog.sui.io/2025-sui-overflow-hackathon-winners/ |
| Contact | devrel@sui.io · @suidevelopers (X) |

---

## Track Coverage Matrix

| Track | Prize | Judging Focus | Overlap Potential | Est. Submissions | Win-EV |
|-------|---|---|---|:---:|:---:|
| The Agentic Web | $62.5k | Autonomous agents, object model | AI ↔ DeepBook (trading agent) | HIGH | LOW |
| DeFi & Payments | $62.5k | Financial primitives, rails | DeFi ↔ DeepBook | HIGH | LOW |
| Special – Walrus | $70k | Large/verifiable data depth | Walrus ↔ AI, ↔ Crypto | MED | **HIGH** |
| Special – DeepBook | $70k | Orderbook trading/liquidity | DeepBook ↔ AI, ↔ DeFi | LOW–MED | **HIGHEST** |

**Multi-track targets (single project submitted to a PRODUCT track + a TECHNOLOGY track — multi-track is allowed, see Multi-Track section):**
- **AI trading agent on DeepBook** → submit to Agentic Web (core) **+** DeepBook (tech).
- **AI memory / verifiable-data app on Walrus** → submit to Agentic Web (core) **+** Walrus (tech).
- **DeepBook-routed payment/DeFi rail** → submit to DeFi & Payments (core) **+** DeepBook (tech).

**Low-competition tracks:** DeepBook (highest win probability), then Walrus.

---

## Domain Knowledge Sources

| Source | URL | Covers | Essential? |
|--------|-----|--------|:---:|
| Sui docs | https://docs.sui.io | Move, objects, PTBs, SDK | YES |
| Sui TS SDK / dapp-kit | https://sdk.mystenlabs.com | Frontend + wallet | YES |
| Walrus docs | https://docs.walrus.site (via Sui) | Blob storage API | YES (if Walrus track) |
| DeepBook docs | https://docs.sui.io/standards/deepbookv3 | CLOB integration | YES (if DeepBook track) |
| Seal docs | Sui docs | Encryption | If private data |
| Participant handbook | https://go.sui.io/overflow26-participant-handbook | Rules, dates, judging | YES |

---

## Kill List — ideas dead on arrival

### 1. Saturated
- Generic "AI agent that does X on Sui" with no deep primitive — the entire Agentic Web track will be flooded.
- Yet another yield optimizer / lending market (Magma, Navi, Scallop, Kamo already own this).
- Generic meme/launchpad (MoonBags, MFC.CLUB territory).

### 2. Broken / High-friction Dependencies
- Anything requiring deep, novel Move contracts you can't realistically write + test in 3 days (Move ramp-up is real).
- Custom hardware / robotics (Suibotics-style) — not 3-day feasible.
- Mainnet-only flows needing real liquidity to demo.

### 3. Already Built — don't clone
- **2025 winners:** Doc signing on Walrus (SuiSign), SQL-on-Walrus (SuiSQL), graph DB (WalGraph), site builder (Walpress), synthetic data marketplace (Suithetic), ML-on-Walrus (OpenGraph), stealth payments (PIVY), whistleblowing (ZeroLeaks), AI yield (Magma), perps (Pismo).
- **2024 winners:** prediction market (Pandora Finance — note: theme still hot, but needs fresh angle), DEX aggregator (Hop), multisig (Kraken), Move decompiler (SuiGPT), ZK quiz (Promise), Wormhole NTT.
- **Funded incumbents:** generic AI-agent platform/launchpad (Talus, Surge, Beep), TEE inference (Atoma), generic DeepBook order-book frontend (20+ exist + DeepBook's own trader-hub), generic "store files on Walrus" (200+ apps, incl. Team Liquid/Alkimi/Allium).

### 4. Zero Alignment
- Non-Sui / multi-chain-first projects where Sui is incidental.
- Pure frontend / no on-chain component.
- Projects that don't map cleanly to ONE of the 4 tracks.

---

## STRATEGIC RECOMMENDATION (for warroom)

Given 3 days + 6-week-behind position, the win condition is **narrow + deep + demo-perfect**:
1. **Target DeepBook ($70k, lowest competition) or Walrus ($70k, most-rewarded primitive).**
2. Build **one** novel feature with genuine native depth — not a platform.
3. Lean on **zkLogin + dapp-kit** to make the demo feel polished fast.
4. Crossover narrative with AI (Agentic Web is the hot theme) without submitting to the crowded AI track.
5. Reserve day 3 entirely for the demo video + submission — judges watch recorded demos.
