# FINAL VERDICT — Sui Overflow 2026 Warroom V1
**Date:** 2026-06-17 | **Deadline:** 2026-06-20 16:00 UTC (~3 days) | **Winner:** SLIPPAGE COURT (Round-0 weighted 7.33)

## Section 1 — Deliberation Transcript (pointer)
Full transcript: `warroom/deliberation-transcript.md` (~120 lines, appended per phase).
Decision artifacts: 5 generators → 35 raw ideas → synthesis (DeepBook-terminal attractor of 6 thinned; 4 hybrids; 0 SEED/HISTORY) → pool_gates (6 presented, 7+ killed) → Round-0 (4 lenses, reranked) → 6 demo scripts (2 strong/4 thin/0 hollow) → pool checkpoint (user: "continue") → fact-check (top-3, 0 hard-fail) → cross-exam (Slippage Court landed [C3] killing blow on Dead-Drop) → challenge (Slippage Court CRITICALs all mitigable; Dead-Drop vetoed) → selection.
User overrides applied: universal concern #1 (time-not-a-constraint) RELAXED — buildability scored this run; pool checkpoint decision "continue with top-3."

## Section 2 — Finalist Ideas
### 1. Slippage Court — 7.33 ★ WINNER
**Problem:** every on-chain trader loses bps to slippage/adverse-selection/front-running with no way to prove or quantify it; DeepBook has $17B volume and no end-user UI. **Mechanism:** read-only — reconstruct DeepBook order-book depth around a fill via on-chain event replay, render an evidenced bps verdict. **Chain-native angle:** a public on-chain CLOB with replayable order events exists only on DeepBook. **Why finalist:** uniqueness conceded by its own adversary + safest build (no Move, no funds). **Why it won:** see Section 3.
### 2. Dead-Drop — 7.23 (vetoed)
**Problem:** secure one-time secret/file handoff. **Mechanism:** Walrus+Seal+linear-Move single-use. **Why finalist:** highest day-1 legibility (VOICE 7.6). **Why it placed here:** cross-exam [C3] KILLING BLOW — clone of 2025 winner ZeroLeaks (Seal+Walrus) + decades-old off-chain category; challenge confirmed both CRITICAL wounds unmitigable in-concept.
### 3. Unlist — 6.75
**Problem:** verifiable deletion / right-to-be-forgotten on permanent storage. **Mechanism:** Walrus `--deletable` + Seal key rotation + on-chain proof-of-un-availability. **Why finalist:** most original framing (Novel 5). **Why it placed here:** fact-check value soft-fail (deletion only denies *future* fetches; already-decrypted buyer keeps plaintext) + shares Dead-Drop's crowded Walrus+Seal stack; lowest Problem-Solution.
### 4. Counterparty — 6.61
**Problem:** agent launchpads have no adversarial proving ground. **Mechanism:** human vs on-chain MM agent spread duel; DeepBook book adjudicates. **Why finalist:** WILD's pick — most repeatable trophy sentence (Originality 5). **Why it placed here:** Tech-Exec divergence (SHIP 3 ↔ NATIVE 7) — needs live taker flow in the demo window; highest-variance 3-day build.
### 5. Liquidate-Me — 6.59
**Problem:** the profitable liquidation/keeper role is invisible, bot-only. **Mechanism:** profit heatmap + one-click atomic PTB (seize→swap on DeepBook→repay). **Why finalist:** most visceral demo (Demo 5). **Why it placed here:** external dependency — needs a testnet Sui lending protocol with readable + triggerable positions you don't control.
### 6. TakerFlip — 6.26
**Problem:** prediction UIs trap you to resolution. **Mechanism:** scalp/flip DeepBook Predict before resolution; World Cup themed. **Why finalist:** timely + vivid demo. **Why it placed here:** fell from pool-gate #1 to Round-0 #6 — niche "degen toy" (VOICE Problem-Solution 4) + binary "is Predict tradeable via SDK" dependency.

**Demo scripts + Round-0 per-criterion table:** see `deliberation-transcript.md` (Round 0 + Demo Scripts sections).

## Section 3 — THE WINNER: Slippage Court
- **Problem-Solution (25%):** real, recurring, money-losing problem; no Sui tool audits your own fill. Round-0 7.5.
- **Technical Execution (25%):** read-only, zero net-new Move, no funds/external-protocol dependency — safest build once scoped. Round-0 7.0.
- **Originality (20%):** "DeepBook forensic theater nobody on Sui is doing" — niche conceded by its adversary. Round-0 7.5.
- **Sui-native depth (20%):** replayable on-chain CLOB events exist only on DeepBook. Round-0 7.75.
- **Usability (10%):** clear forensic verdict; needs a watchlist view for stickiness. Round-0 6.5.
- **Uniqueness:** zero confirmed competitors in DeepBook execution-audit; fact-check confirmed the indexer/SDK substrate is real.
- **Users (day-1, today):** active DeepBook / Sui DEX traders who suspect bad fills — reachable via Sui trading Discords/X.
- **Conviction:** "would I build a 'did I get ripped off on this trade' tool without a prize?" — yes; execution quality is real money.
- **One shocking number:** $17B DeepBook volume, $0 of fill-audit tooling.
- **Minority dissent:** VOICE (checks-once frequency → add watchlist), WILD (Counterparty's trophy sentence → but higher build variance). Both addressed.

## Section 4 — Risk Register
| # | Risk | Severity | Likelihood | Impact | Mitigation | Source |
|---|------|:--------:|:----------:|--------|-----------|--------|
| 1 | Historical book-depth-at-block not in Indexer; needs event replay (scope fantasy) | CRITICAL | High | Core feature fake/absent | Bounded/recent-window replay; prove on 1 tx; never claim arbitrary-block | challenge |
| 2 | Silent current-depth substitution → wrong verdict on volatile tx (eloquence-over-evidence) | CRITICAL | Med-High | Credibility collapse on stage | Label provenance; refuse verdict without real reconstruction; show ladder | challenge |
| 3 | Unprovable "front-run" claims (research neglect) | HIGH | High | Security judge probes, no answer | Evidenced language; surface adversary tx or attribute to depth-shift | challenge |
| 4 | zkLogin = dead weight on read-only tool (scope fantasy) | HIGH | Med-High | Build day lost, weaker core | Cut zkLogin entirely | challenge |
| 5 | Edge cases (multi-hop/partial/non-DeepBook) break live paste | MED | High | Crash/nonsense on judge tx | Detect-and-degrade, honest "out of scope" | challenge |
| 6 | Checks-once frequency caps stickiness (UX) | MED | Med | Reads as feature not product | Add portfolio/watchlist execution-quality view | VOICE dissent |
| 7 | "Read-only glance" undersells in a 3-min demo | MED | Med | Quieter than a live-action demo | Lead with a vivid front-run catch + 0-bps clean contrast | cross-exam |
| 8 | Thin Walrus use if the optional anchor is bolted on | MED | Med | Repeats the critique that sank Dead-Drop | Pursue Walrus anchor ONLY at genuine corpus-depth, else drop | cross-exam |

## Section 5 — Concerns Compliance
| # | Sev | Concern | How the winner addresses it |
|---|:--:|---------|------------------------------|
| 1 | C(relaxed) | Time | Buildability scored; winner is the safest build (read-only, no Move). |
| 3 | C | Uniqueness | Uncontested DeepBook-forensics niche; conceded by adversary; fact-check confirmed substrate. |
| 5 | C | Real humans | Active DeepBook/Sui DEX traders who suspect bad fills. |
| 9 | C | Significant + conviction | Execution quality = real money; builder would build it unprompted. |
| 13 | C | Day-1 users | Anyone who traded on DeepBook today. |
| 15 | C | No self-duplication | Not any builder shape (not AlphaAttest/agents/private-DeFi); a read-only auditor — clean. |
| C-PH1 | C | Specialized anchor | DeepBook $70k primary + DeFi & Payments core. |
| C-PH2 | C | Demo-perfect | 3-min evidenced-verdict demo; scope-honesty invariants protect it. |
| I-PH3 | I | Minimize Move | Zero net-new Move. |
| I-PH4 | I | No winner clones | Not a 2024/25 winner or incumbent clone (this is precisely how Dead-Drop fell). |
| 10 | I | Focused/broad | Focused tool, broad audience (all on-chain traders). |
| A | A | Bounty stacking | DeepBook + DeFi; optional Walrus only at real depth. |

## Section 6 — Forge Handoff
See `warroom/WINNER-BRIEF.md` (contains the mandatory `## Thesis` block).

## Pool Stats
Raw 35 (G1:7 G2:6 G3:8 G4:7 G5:7) · 4 hybrids · 0 SEED/HISTORY · presented 6 · killed 11+ · brief levers 12/15 mapped · regen 0 · rescued 0 · pool-checkpoint: user "continue".
