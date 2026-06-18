# DESIGN_SYSTEM.md — RefiRail

> Tier-B restraint pass. The token system + craft floor applied to the existing proven
> codebase (no variations, no mockup parity baseline). Consumed by build/stress/demo-video.
> The proven PTB core (lib/*) and the API contract (/api/position, /api/preview) are
> untouched — this contract governs the presentation layer only.

## Identity
- **World**: institutional on-chain finance — loan *settlement* that moves on rails, Sui-native.
- **Accent (one color)**: `#4DA2FF` (Sui aqua). All surface variety = opacity derivatives.
- **Signature element — "the Rail"**: a thin aqua rail sits under the wordmark in the first
  viewport and becomes a literal `Navi ●─────● Suilend` rail in the BeforeAfterPanel — the loan
  visibly travels from the costlier lender to the cheaper one. This is the thing you describe afterward.

## Tokens
**Color — derivative system (one hue):**
```
--brand:       #4DA2FF
--brand-soft:  rgba(77,162,255,0.55)   /* interactive / selected fills */
--brand-glow:  rgba(77,162,255,0.32)   /* borders, rings, focal glow */
--brand-faint: rgba(77,162,255,0.12)   /* section tints, rail track */
--brand-dim:   rgba(77,162,255,0.06)   /* barely-there texture */
```
**Surface elevation (dark — elevate via bg steps, never invisible drop-shadows):**
```
--bg:        #060A12   /* page base (never #000) */
--surface:   #0C131E   /* card level */
--surface-2: #131C2B   /* elevated / hover / modal */
--border:    rgba(255,255,255,0.07)   /* hairline divider */
--border-hot: rgba(77,162,255,0.22)   /* active / selected border */
--fg:        #E6EEF8
--muted:     #8A9AB0
```
**Status (semantic only — NOT a second accent):**
```
--status-ok:     #4ade80   /* save / healthy / lower APR */
--status-danger: #f87171   /* would-revert / higher APR */
--status-warn:   #fbbf24
```
**Type scale (clamp() display, tokenized):**
```
--text-hero: clamp(2.4rem, 7vw, 3.4rem)   /* DM Serif Display wordmark, ls -0.02em */
--text-lg:   clamp(1.05rem, 2.4vw, 1.25rem)
--text-base: 0.95rem      --text-sm: 0.8rem      --text-xs: 0.72rem
labels: uppercase, letter-spacing 0.08em, --muted
numerics: font-variant-numeric: tabular-nums (IBM Plex Mono)
```
**Spacing**: 4 / 8 / 12 / 16 / 24 / 32 (`--sp-1..6`). **Max width**: `--maxw: 540px` (focused single-screen flow, DV=3).

## Craft
- **Radius scale (CF-1)**: `--radius-sm 8px` (controls/badges) · `--radius-md 14px` (cards) · `--radius-lg 20px` (hero/success) · `--radius-full 999px` (pills). Varies by role; zero ad-hoc literals in components.
- **Elevation ladder (CF-2)**: base `--bg` → `--surface` (cards, hairline border + inset top highlight) → `--surface-2` (hover/elevated). Background-delta carries depth; borders accompany, never replace.
- **DECLARED SHADOW PHILOSOPHY (CF-5): Pure-glow.** Dark luminous world. Elevation comes from background steps; the brand-alpha glow is reserved for ≤2 focal elements per viewport — the primary CTA and the success state. The generic `0 4px 20px rgba(0,0,0,.1)` blur is banned. Cards use an `inset 0 1px 0 rgba(255,255,255,0.04)` top-edge catch for material depth (not glass — no backdrop-filter).
- **Glass recipe**: not used (pure-glow world; no `backdrop-filter` anywhere → CF-3 vacuously satisfied).
- **Hover recipe (CF-4)**: buttons/links/ConnectButton lift `translateY(-1px)` + glow/border step-up; `.card` hover steps bg to `--surface-2`. All inside `@media (hover: hover)`.
- **Focus recipe (CF-4)**: app-wide `:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px }`; CTA gets a brand-glow ring. Keyboard users get the same depth language.
- **Signature element**: "the Rail" (see Identity) — stays visible in the first viewport as the wordmark underline.

## Primitives
The established global classes ARE the crafted primitives all components consume (single-stylesheet app — no prefix churn; CF-7 met by reuse, not rename):
- `.card` — surface + hairline + inset top highlight + radius-md + entrance/hover.
- `.cta` — aqua fill, glow ring, hover lift, focus ring (RefinanceButton).
- `.ghost` — outline control, hover border/bg step (Preview button).
- `.row` — label/value line, tabular numerics.
- `.badge` — pill, brand-faint fill (save callouts).
- `.tag` — uppercase tracked-out micro-label (--muted).
- `.rail` — the signature: track (`--brand-faint`) + two nodes + travelling loan dot.
- `.txlink` — aqua link, underline-on-hover, focus ring.

## Motion (MI=4 — CSS only, GPU-composited, prefers-reduced-motion honored)
Semantic keyframe names (never motion names):
- `enter-settle` — card/section entrance (opacity + small translateY), eased stagger via nth-child. 300–400ms.
- `rail-travel` — the loan dot moving Navi→Suilend on preview-ok. 700ms ease-in-out.
- `value-flash` — APR/savings number flashes brand on update, settles to --fg. 600ms.
Buttons 150ms, cards 300ms, rail/section 600ms+ — durations and easings vary per element type (no `transition: all`). `@media (prefers-reduced-motion: reduce)` disables animation/transition and pins end states.
