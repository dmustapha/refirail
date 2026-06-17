# WAR ROOM V1 — SUI OVERFLOW 2026 DELIBERATION BRIEF
**Date:** 2026-06-17 | **Objective:** Pick THE ONE idea that is BOTH most winnable AND solves a significant real problem — buildable + demo-perfect in ~3 days.

## NON-NEGOTIABLE RULES (from the builder)

### Critical [C]
- **[C3] Uniqueness** — zero confirmed competitors in the exact niche. Don't clone 2024/2025 winners or funded incumbents.
- **[C5] Real humans** — name specific humans + their specific problem ("DeFi users" is not specific).
- **[C9] Significant problem + conviction** — builder would build it without a prize.
- **[C13] Day-1 users exist TODAY** — identifiable, reachable now.
- **[C15] No self-duplication** — must not rebuild a shipped/in-flight builder shape (see Forbidden Shapes).
- **[C-PH1] Specialized-track anchor** — primary identity must be a LOW-COMPETITION specialized track (DeepBook $70k or Walrus $70k); pair with a core track via multi-track. Flooded AI/DeFi cores are NOT a viable sole identity.
- **[C-PH2] Demo-perfect is the win condition** — reserve day 3 for demo video + submission; the 3-min demo must land a visible WOW.

### Important [I]
- **[I-PH3] Minimize net-new Move** — lean on dapp-kit, DeepBook SDK, Walrus TS SDK, zkLogin. Custom Move must be thin + testable in 3 days. (See override of universal concern #1 below.)
- **[I-PH4] No incumbent/winner clones** — Talus, Surge, Beep, Atoma, Myriad; SuiSign, SuiSQL, Suithetic, OpenGraph, Pismo, Magma, Pandora.
- **[I2] testnet OK** — mocks fine, but TASTE U7: demo state must be EARNED, not fabricated where it contradicts the core claim.
- **[I10] Focused product, BROAD problem** — niche scope OK, niche audience NOT.

### Advisory [A]
- **[A] Sponsor bounty stacking** — multi-track + ecosystem bounties is the strategic play; stack only where architecture naturally uses the primitive.
- **[A] Privacy via Seal** — available depth lever, not mandatory.

### USER OVERRIDE (documented per concerns §Conflict-Resolution rule 4)
- **Universal concern #1 ("Time NOT a constraint / Claude Code = 10x / don't penalize complexity") is RELAXED for this hackathon.** Reason: (a) only ~3 days remain — a genuine external deadline (the emergency exception), and (b) Move is unfamiliar with a steep ramp that Claude Code does not fully neutralize. **Buildability and net-new-Move surface area ARE legitimate scoring constraints here.** SHIP (Builder) is empowered to kill on 3-day infeasibility.

## TASTE CONTRACT
Universal Laws U1-U7 (integral/real, judge SEES it in 3 min, exciting>safe, no reskins, builder-buildable, **integration depth is the strategy — native-primitive depth wins**, demo state earned). Conditional blocks active: **C-AI1** (AI must be the product not a wrapper), **C-DF1** (real value flows on-chain in demo), **C-IN1** (infra needs a live visible consumer), **C-CS1** (first-session wow without docs).

## FORBIDDEN SHAPES (builder history — base-stack kill-list; any match = killed)
- ⚠️ **AlphaAttest** (SHIPPED ~06-14) — commit-before-publish on-chain accountability/attestation for agents; verifiable agent track-record/resume; falsifiable on-chain alpha; **prediction-commit → auto-resolve → reputation ledger**; yield-agent realized-APY reputation. **HIGHEST collision risk vs the prediction-market theme: a prediction product that reduces to "commit a call, auto-resolve, build a track record" IS AlphaAttest. Prediction MARKETS (trading outcome shares on a CLOB/AMM) are a DIFFERENT mechanism — that distinction is the firewall.**
- **Backstop** (SHIPPED ~06-15, Mantle) — agent-transaction guardian/co-signer that simulates + vetoes an AI agent's txs before they hit chain.
- **AgentMesh** — agent-to-agent marketplace / discovery / payment mesh / reputation registry / multi-agent coordination.
- **Agent Auditor** — agent trust scoring, on-chain agent reputation, sybil scanner, autonomous attestation writer, agent identity verification.
- **x9** — autonomous AI agent with its own wallet + persistent DB memory as the product.
- **GhostFund / GhostPay / SolvencySwap / CRE-Gate** — private FHE yield vault; private/selective-disclosure payments; depeg circuit-breaker / forced-liquidation solvency monitor; compliance-gate-before-DeFi-execution.

## HACKATHON FACTS
- **Name:** Sui Overflow 2026 | **Organizer:** Sui Foundation / Mysten Labs | **Platform:** DeepSurge.
- **Deadline:** 2026-06-20 16:00 UTC (~3 days). Build opened May 7 (competitors ~6 weeks ahead).
- **Pool:** $500k+. **Chain:** Sui (Move).
- **Tracks:** The Agentic Web (AI) $62.5k · DeFi & Payments $62.5k (OpenZeppelin + OtterSec sponsors) · **Special–Walrus $70k** · **Special–DeepBook $70k**.
- **Multi-track ALLOWED (verbatim Sui rule):** one project may enter a product/core track + a Sui technology/specialized track + ecosystem bounties.
- **Sidetracks:** University (Scallop, $2.5k×~10), Community (~$25k vote).
- **Judges:** "domain experts, investors, builders" (no named list captured).
- **Demo:** recorded; length unconfirmed (assume 2–4 min). Submit via DeepSurge.

## JUDGING CRITERIA (derived; no official weights published)
| Criterion | Weight | Score high by |
|---|:--:|---|
| Problem-Solution fit / real-world use | 25% | solve a real problem people have today |
| Technical execution (working demo, clean Move) | 25% | functional end-to-end, no crashes |
| Originality / innovation | 20% | novel combination, not a clone |
| Sui-native depth (objects, composability, perf) | 20% | use Sui primitives meaningfully (U6) |
| Usability / UX / presentation | 10% | polished UI, clear 2-min story |

## SUI / SPONSOR CAPABILITIES
DeepBook v3 (shared CLOB, $17B vol, 390ms, Spot/Margin/Predict, NO native UI), Walrus (verifiable blob storage, Quilt, Seal, TS SDK), zkLogin (social→wallet), PTBs (atomic composability), Nautilus (TEE compute). Path of least resistance: dapp-kit + TS SDK + zkLogin + DeepBook SDK + Walrus TS SDK; thin Move on top.

## KNOWN COMPETITORS / CROWDING
- **AI / Agentic Web — HIGH crowding:** Talus ($10M), Surge, Beep, Atoma, DeAgent. Generic agent platform = dead on arrival.
- **DeFi & Payments — HIGH:** Magma, Pismo, Navi, Scallop, Kamo.
- **Walrus — MEDIUM:** 200+ apps (Team Liquid, Alkimi, Allium, Myriad). Generic storage taken; verifiable-data + AI/finance angle open.
- **DeepBook — LOW–MED (best win-EV/$):** 20+ apps + DeepBook's own trader-hub (Spot/Margin/Predict). Generic orderbook frontend taken; novel consumer app on Margin/Predict open.
- **2025 winners (don't clone):** Suithetic, OpenGraph, Magma, Pismo, SuiSQL, SuiSign, WalGraph, Walpress, ZeroLeaks, DeepMaker, PIVY.
- **2024 winners:** Pandora Finance (prediction mkt), Hop (DEX aggregator), Kraken (multisig), SuiGPT (Move decompiler), Promise (ZK quiz).

## ECOSYSTEM DATA
Grid/Copilot saturation not run (Sui outside Solana corpus). DeepBook = lowest saturation; AI = highest. **Prediction markets = breakout 2026 Sui theme** (Myriad/Walrus $5M+, DeepBook Predict, WaterX World Cup 2026 live, Yoso, Pandora'24, Skepsis'25) + FIFA World Cup 2026 is LIVE = exceptional timeliness. Sui 2026 roadmap signals: DeepBook Margin + referral income-sharing, USDsui native yield-stablecoin, Walrus+Seal cross-chain data tokenization, Nautilus TEE + external LLMs for agents.

## THE BUILDER
Damilola — TypeScript, Next.js, Solidity/Foundry, full-stack, AI agents, rapid hackathon builds. Tools: Claude Code pipeline, Vercel. **Move needs ramp-up.** Preference: deep native integration over breadth, polished UX, demo-driven, solo/small team.

## SCORING (1-10 per criterion at Round 0)
Plus YC Problem Quality (0-6): how big, urgent, underserved is the problem? <3 = hard-eliminated.
