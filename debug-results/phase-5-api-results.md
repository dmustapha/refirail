# Phase 5 — API Edge Cases (Tier 2 curl, live dev server)

Tested both routes against a running `next dev` server on live Sui mainnet. Criterion: every
edge case must return a clean 4xx/5xx with a JSON error shape — never an unhandled 500 crash.

## Result: PASS. No route crashed on any input.

Two **quality** fixes applied (ARCHITECTURE §18 Layer 1 — input validation): malformed input now
returns a clean **400 client error** instead of a **503 server error**, and invalid-address preview
calls now fail in ~5ms instead of wasting a ~6s RPC build round-trip. Logged as DEV-019.

## /api/position (GET)

| Case | Input | Before fix | After fix | JSON shape |
|------|-------|-----------|-----------|------------|
| Missing address | `?` (none) | 400 | 400 | `{"error":"missing or invalid address"}` |
| Invalid (no 0x) | `address=notanaddress` | 400 | 400 | `{"error":"missing or invalid address"}` |
| Malformed 0x | `address=0x123` | **200** (silent empty-state) | **400** | `{"error":"missing or invalid address"}` |
| Valid demo addr | `address=0xc98e…393b3` | 200 | 200 (no regression) | `{"hasPosition":false,...,"note":"..."}` |
| Wrong method | `POST /api/position` | 405 | 405 | (Next default 405) |

## /api/preview (POST)

| Case | Input | Before fix | After fix | JSON shape |
|------|-------|-----------|-----------|------------|
| Empty body | `{}` | 400 | 400 | `{"ok":false,"abortReason":"missing params"}` |
| Malformed JSON | `{not valid json` | 400 | 400 | `{"ok":false,"abortReason":"invalid json"}` |
| Partial params | `{"address":"0xabc"}` | 400 | 400 | `{"ok":false,"abortReason":"missing params"}` |
| Non-numeric amount | `debtAtomic:"abc"` | **503** (`Cannot convert abc to a BigInt`) | **400** (20ms) | `{"ok":false,"abortReason":"invalid amount"}` |
| Invalid address | `address:"notanaddress"` | **503** (6.0s, `Invalid Sui address`) | **400** (5ms) | `{"ok":false,"abortReason":"invalid address"}` |
| Negative amount | `debtAtomic:"-5"` | (would build) | **400** | `{"ok":false,"abortReason":"invalid amount"}` |
| Wrong method | `GET /api/preview` | 405 | 405 | (Next default 405) |
| **Valid path** | demo addr + valid amounts | 503 abort-1602 | **503 abort-1602** (no regression) | `{"ok":false,"abortReason":"... MoveAbort ... execute_repay ..."}` |

## Fixes applied (DEV-019)

`app/api/preview/route.ts`: added a Layer-1 guard before `buildRefinancePTB` — reject non-0x/64-hex
addresses and non-positive/non-finite amounts with a clean 400; parse `BigInt`/`Number` inside a
guarded block. 503 is now reserved for real downstream/RPC failures.

`app/api/position/route.ts`: tightened the address check from `startsWith("0x")` to the full
`/^0x[0-9a-fA-F]{64}$/` regex so a malformed `0x123` is a 400 rather than a silent empty-state 200.

## Notes
- The valid `/api/preview` for the demo wallet returns `ok:false` + Navi `execute_repay` **abort 1602**.
  This is the EXPECTED truth: the demo wallet's position moved to Suilend (real refinance digest
  BiMBPK7…), so there is no Navi USDC debt left to repay. Not a bug — the no-position state surfacing
  as a clean structured abort.
- 405 responses (wrong method) use Next.js's default handler and return an empty body. Acceptable for
  the demo; the routes' own error responses are all JSON. Logged as NOTE, not fixed.
