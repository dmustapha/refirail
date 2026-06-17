# Sui Overflow 2026 — Ideas
## Selected: SLIPPAGE COURT (Round-0 weighted 7.33) — DeepBook $70k + DeFi & Payments

## Pool Stats
- Raw generated: 35 (G1:7 G2:6 G3:8 G4:7 G5:7)
- Hybrids: 4 | Late entrants: [SEED] 0 (corpora used as validators), [HISTORY] 0 (all builder shapes forbidden)
- Killed — kill list/already-built: 3 | history/forbidden: 1 | demo test: 1 (demoted) | score floor: 0 | anti-attractor: 7 (terminal cluster + agent cluster thinned) | strategy [C-PH1] no-anchor: 3
- Brief levers: 12/15 mapped (unmapped: Nautilus, Margin, pure-payments) | Regeneration rounds: 0 | Rescued: 0
- Presented: 6

## Presented Pool

### #1: TakerFlip — scalp DeepBook Predict markets, flip your side before resolution
**Score:** 23/25 — Ship [4] | Demo [5] | Sponsor [5] | Novel [4] | Memorable [5]
**Mechanism:** A momentum-scalping UI on DeepBook v3 **Predict** markets. Existing prediction UIs trap you in a YES/NO position until resolution. TakerFlip surfaces the live CLOB depth as a tradeable EXIT — take a side (fills off real DeepBook depth), price moves, FLIP against the book, realize P&L continuously. PTBs batch take→flip→settle atomically. Themed to **live FIFA World Cup 2026** markets.
**Why this chain (U6):** Flipping mid-life requires a real on-chain order book with live depth + 390ms matching. Off Sui there is no shared CLOB to flip against — you'd have a centralized exchange API, a different product.
**3-min demo shape:** Judge opens a live World Cup Predict market, taps a side (real fill), price ticks, taps FLIP (position reverses against the book), realized P&L climbs — 3 flips in 60s, every one an on-chain tx hash, no resolution wait.
**TASTE:** U1, U2, U3, U6, U7, C-DF1.
**Origin:** G3 Inversion (× World Cup framing).
**⚠️ Load-bearing dependency:** DeepBook "Predict" must expose tradeable outcome-share markets via SDK on testnet. FACT-CHECK.

### #2: Unlist — the verifiable-deletion data marketplace (right-to-be-forgotten on Walrus)
**Score:** 23/25 — Ship [3] | Demo [5] | Sponsor [5] | Novel [5] | Memorable [5]
**Mechanism:** Inverts "permanent storage." A Walrus+Seal marketplace where the SELLER can provably DELETE: kill blob availability + rotate the Seal key so a sold blob becomes permanently unrecoverable, with an on-chain proof of un-availability. Buyers get Seal-gated access; sellers honor real deletion/GDPR.
**Why this chain (U6):** Walrus availability proofs + Seal key-rotation are the only way to make deletion VERIFIABLE rather than promised — you prove the blob is gone, not merely hidden. Impossible on permanent-storage chains.
**3-min demo shape:** Judge buys an encrypted dataset (Seal-gated), opens it; seller hits REVOKE → UI shows the availability proof flip to un-available + the Seal key rotate; judge's re-fetch now fails, with on-chain proof of deletion.
**TASTE:** U1, U2, U3, U6, U7, C-DF1.
**Origin:** G3 Inversion.
**⚠️ Load-bearing dependency:** Seal key-rotation/revocation + provable end-of-availability must be achievable via SDK in 3 days. FACT-CHECK (hardest).

### #3: Walrus Dead-Drop — single-use, self-destructing encrypted file handoff
**Score:** 22/25 — Ship [4] | Demo [5] | Sponsor [5] | Novel [4] | Memorable [4]
**Mechanism:** Sender uploads → Quilt+Walrus stores → Seal encrypts under a policy "decryptable exactly once, then the access object burns." Single-use is enforced by **linear Move object consumption** — the access object is consumed on first decrypt and can never be reused. zkLogin onboards the recipient.
**Why this chain (U6):** Single-use lives in on-chain linear-object consumption (Move objects are linear — consumed once, gone); Seal ties decryption to that object. Off-chain "delete after one read" is a server honor system.
**3-min demo shape:** Judge uploads a secret, gets a one-time link; opens in a fresh browser → decrypts + downloads; opens the link again → on-chain access object already consumed, decryption denied, key-shares refuse. "It's really gone," verifiable on the explorer.
**TASTE:** U1, U2, U3, U6, U7, C-CS1.
**Origin:** G5 Clean-room.
**⚠️ Dependency:** Seal one-time key release tied to object consumption. FACT-CHECK.

### #4: Slippage Court — DeepBook execution-quality audit ("were you front-run?")
**Score:** 21/25 — Ship [4] | Demo [4] | Sponsor [4] | Novel [5] | Memorable [4]
**Mechanism:** Paste a swap/fill tx → it reconstructs the DeepBook CLOB depth that existed at your fill's block and renders a verdict in bps: you got the book's best price, or you were front-run / mis-routed, quantified. Read-only; no funds at risk. Audit snapshots optionally anchored as Walrus blobs (dual-track).
**Why this chain (U6):** Only DeepBook's on-chain CLOB lets you reconstruct exact historical depth at a block and prove what the best achievable price WAS — verifiable, not a vendor claim.
**3-min demo shape:** Judge pastes a recent swap tx; UI pulls the fill, reconstructs depth at that block, overlays "you paid X / book best was Y / verdict: 4bps worse, partial front-run," all from on-chain orderbook state.
**TASTE:** U1, U2, U3, U6, U7, C-DF1.
**Origin:** G3 Inversion (× Walrus anchor hybrid). **SAFEST BUILD (read-only).**

### #5: Counterparty — challenge an on-chain market-making agent to a spread duel
**Score:** 21/25 — Ship [3] | Demo [4] | Sponsor [4] | Novel [5] | Memorable [5]
**Mechanism:** Inverts the "agent acts FOR you" launchpad model: an agent that trades AGAINST you. A human and an on-chain MM agent both quote the SAME DeepBook pair; real taker flow hits the book; the CLOB decides who got filled. Winner takes the on-chain pot. The agent IS the product (C-AI1).
**Why this chain (U6):** The duel only resolves because DeepBook is a shared L1 CLOB — both sides post real maker orders to the same book, fills are on-chain ground truth. No simulated fill server. PTBs settle the pot.
**3-min demo shape:** Judge picks SUI/USDC, agent and judge both post quotes to DeepBook, pre-seeded taker flow hits the book for 90s, leaderboard ticks fill-by-fill, winner takes the pot — live CLOB, live agent, live money.
**TASTE:** U1, U2, U3, U6, U7, C-AI1, C-DF1.
**Origin:** G3 Inversion. **(Only agent-shaped idea kept — anti-attractor ≤1.)**

### #6: Liquidate-Me — the liquidator's cockpit (the invisible keeper role, made human)
**Score:** 20/25 — Ship [4] | Demo [5] | Sponsor [3] | Novel [4] | Memorable [4]
**Mechanism:** Lending UIs serve borrowers hiding from liquidation; the profitable keeper role is invisible bot-only plumbing. Liquidate-Me gives it a face: a live heatmap of at-risk Sui lending positions ranked by profit; click LIQUIDATE → one atomic PTB seizes collateral → swaps on DeepBook → repays → profit lands in your wallet.
**Why this chain (U6):** PTBs let seize→swap→repay execute atomically in one click — the whole opportunity-to-profit path is one chain-native tx. Live health reads straight from on-chain lending objects.
**3-min demo shape:** Judge sees a heatmap of live loans; one flips liquidatable (health <1); judge clicks LIQUIDATE; the PTB seizes+swaps+repays atomically; realized profit lands in the judge's wallet on-screen with the tx hash.
**TASTE:** U1, U2, U3, U6, U7, C-DF1.
**Origin:** G3 Inversion.
**⚠️ Dependency:** needs a testnet Sui lending protocol with readable/liquidatable positions you can trigger. FACT-CHECK.

## Brief-Utilization Map
| Lever | Idea(s) |
|---|---|
| DeepBook CLOB | TakerFlip, Slippage Court, Counterparty, Liquidate-Me (swap leg) |
| DeepBook Predict | TakerFlip |
| Walrus storage + proofs | Unlist, Dead-Drop, Slippage Court (anchor) |
| Seal encryption/access policy | Unlist, Dead-Drop |
| zkLogin | Dead-Drop, TakerFlip, Counterparty (onboarding) |
| PTB atomicity | Liquidate-Me, TakerFlip, Dead-Drop |
| Prediction-market theme + World Cup | TakerFlip |
| Security/audit (OtterSec) | Slippage Court |
| AI crossover (Agentic Web) | Counterparty |
| Liquidation/keeper | Liquidate-Me |
| Nautilus | no idea found — TEE-in-3-days build risk |
| DeepBook Margin | no idea found — "launching", dependency-deferred (Leverage Anything held in reserve) |
| Pure payments rails | no idea found in pool — no specialized-track anchor ([C-PH1]) |

## Killed Ideas (selected)
| Idea | Origin | Gate | Cause |
|---|---|---|---|
| DeepBook Strategy Vaults w/ Walrus track-record | G4 | Gate1 | builder_history_repeat (AlphaAttest-adjacent) |
| DeepBook Yield Router | G4 | Gate1 | already_built (DeepMaker 2025) |
| Nautilus Agent Desk | G4 | Gate1 | saturated + build_infeasible |
| DeepBook Terminal / zkLogin Trading Desk / Pulse / Forkable / One-Click (cluster) | G1/G2/G5 | Gate5 | anti_attractor (terminal) + low novelty |
| Agent Vault on DeepBook | G2 | Gate5 | anti_attractor (≤1 agent → Counterparty kept) |
| Split / Tab / zkLogin Payment Links | G5/G4 | strategy | no specialized-track anchor [C-PH1] |
| Maker's Revenge | G3 | Gate2 | demo_test (needs external taker flow) |
| Sealed Drop / Data Vault Marketplace / Federated Co-op | G2/G4 | Gate1 | already_built (Allium-adjacent) |
| Quilt Capsule / Time Capsule / Proof-of-Memory | G2/G5 | score | lower novelty/stakes (Walpress/SuiSign-adjacent) |
| Proof-of-Render | G3 | Gate2 | build_infeasible (AI pipeline + TEE in 3 days) |
| Rewind | G3 | spike | strong (20/25) but edged out; reserve |
| Onboard (Move playground) | G1 | score | weak prize alignment (no specialized anchor) |
