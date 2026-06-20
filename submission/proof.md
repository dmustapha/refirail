# RefiRail — On-chain Proof Ledger (Sui mainnet)

Every operation below is a **real transaction on Sui mainnet**, executed by RefiRail's own
engine and dry-run-gated before signing. These are legitimate self-operations run to exercise
the system end-to-end and build real DeepBook order-book volume — reported here as test
operations, never framed as third-party usage.

- **Demo wallet:** `0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3`
- **Headline atomic refinance (Navi→Suilend, one PTB):** [BiMBPK7sLPc1…](https://suiscan.xyz/mainnet/tx/BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK)
- **Headline atomic deleverage (DeepBook flash + two-hop):** [4S5bhsgZ…](https://suiscan.xyz/mainnet/tx/4S5bhsgZhsrwjaavUNBAZKyDwWKxKfruUTUXD6jT3S8K)

## Summary
| Category | Count |
|----------|------:|
| DeepBook swaps (SUI↔USDC, fee-free two-hop) | 30 |
| Deleverages (DeepBook-powered, atomic) | 3 |
| Borrow-backs (Navi, position reset) | 0 |
| Atomic revert-proofs (safety, $0 dryRun) | 2 |
| **Total signed mainnet ops** | **33** |

## DeepBook swaps
- `swap-sui-usdc` — 0.35 SUI → ~0.2469 USDC — [BM9ioQ3PhTDG…](https://suiscan.xyz/mainnet/tx/BM9ioQ3PhTDG1ZKDhBEDeNWhuszXHSgZX2FjN7w3ExfG)
- `swap-usdc-sui` — 0.2469 USDC → ~0.3252 SUI — [ELEo7GRfeZrJ…](https://suiscan.xyz/mainnet/tx/ELEo7GRfeZrJrBdE9dVzheJe1hVVyred6iMsvK58YCdZ)
- `swap-sui-usdc` — 0.35 SUI → ~0.2470 USDC — [E2j794yeQ8qo…](https://suiscan.xyz/mainnet/tx/E2j794yeQ8qoedpXSii7CfabsHYz1KwV7YFQfiT5LnpB)
- `swap-usdc-sui` — 0.247 USDC → ~0.3252 SUI — [CqKUWmN6EXGW…](https://suiscan.xyz/mainnet/tx/CqKUWmN6EXGWDXXSk5XmhbBgGv7HpjB2BqmPoNh7J4jN)
- `swap-sui-usdc` — 0.35 SUI → ~0.2470 USDC — [8E1skBngcTUB…](https://suiscan.xyz/mainnet/tx/8E1skBngcTUB56kMYQD6rBAZVjuRFakbcxA1xkeCrsKa)
- `swap-usdc-sui` — 0.247 USDC → ~0.3251 SUI — [7SFGVWfB13Fn…](https://suiscan.xyz/mainnet/tx/7SFGVWfB13FnHcEhWVmdhTqbTwE21JiSx1eCC2yGjH3Z)
- `swap-sui-usdc` — 0.35 SUI → ~0.2470 USDC — [6z3tMgsQPV9q…](https://suiscan.xyz/mainnet/tx/6z3tMgsQPV9qd6AGZAT5X1QrrDdz9A3NUWH8sN2vyP9Y)
- `swap-usdc-sui` — 0.247 USDC → ~0.3251 SUI — [Y2ecsxuGRXoh…](https://suiscan.xyz/mainnet/tx/Y2ecsxuGRXohziUUxhmqp9TN1vYT3DZwKXYH4Ww2YiE)
- `swap-sui-usdc` — 0.35 SUI → ~0.2470 USDC — [8cDQcdELV9du…](https://suiscan.xyz/mainnet/tx/8cDQcdELV9duV3z6Et5yjutes1K6cCxM7GyNFe3Hb2Kv)
- `swap-usdc-sui` — 0.247 USDC → ~0.3251 SUI — [FKKCttzGLxmL…](https://suiscan.xyz/mainnet/tx/FKKCttzGLxmLac1y1TEAimEtA5yyPZ6A8ywy7D85GWc4)
- `swap-sui-usdc` — 0.35 SUI → ~0.2470 USDC — [BiSXRcak9E4W…](https://suiscan.xyz/mainnet/tx/BiSXRcak9E4We5yCLtyNWjzWoDnZozWyDBinwDqMGJFc)
- `swap-usdc-sui` — 0.247 USDC → ~0.3251 SUI — [7jjecTwK2byR…](https://suiscan.xyz/mainnet/tx/7jjecTwK2byRyJ5tgKKcbM3Gc3Vtzfbn1eAoKYJD3wzS)
- `swap-sui-usdc` — 0.35 SUI → ~0.2470 USDC — [E8gCUzQJD3UN…](https://suiscan.xyz/mainnet/tx/E8gCUzQJD3UNDz4iQ59FAhbhNMSdTRSEGAcTahoKW4U3)
- `swap-usdc-sui` — 0.247 USDC → ~0.3251 SUI — [9qRN9guruKJR…](https://suiscan.xyz/mainnet/tx/9qRN9guruKJRp6pzip1ZkBJ9XPNqraQSP3U1FNdVEyf3)
- `swap-sui-usdc` — 0.35 SUI → ~0.2470 USDC — [C78CwU6JgK1K…](https://suiscan.xyz/mainnet/tx/C78CwU6JgK1KzZxmmbL26w3G1E9YCgmS1HiBLTJC11Jr)
- `swap-usdc-sui` — 0.247 USDC → ~0.3252 SUI — [4astNo2HTTZS…](https://suiscan.xyz/mainnet/tx/4astNo2HTTZSXJJod68puYjmGwJT8f1tP83eXUNZn4B9)
- `swap-sui-usdc` — 0.35 SUI → ~0.2469 USDC — [EYama6JJWDah…](https://suiscan.xyz/mainnet/tx/EYama6JJWDahCbsJ19DiuRv1md5tNEhHkvsZsjHW2Hy1)
- `swap-usdc-sui` — 0.2469 USDC → ~0.3252 SUI — [DGbouBtcxHtV…](https://suiscan.xyz/mainnet/tx/DGbouBtcxHtVTdSgb99UkKQ777K7B2ScHAyJxGu7taxh)
- `swap-sui-usdc` — 0.35 SUI → ~0.2470 USDC — [8TnqMAQFK5nt…](https://suiscan.xyz/mainnet/tx/8TnqMAQFK5ntjsNRGQ2cCRrMzXPSjmkuMoCZfWRCQKwz)
- `swap-usdc-sui` — 0.247 USDC → ~0.3252 SUI — [83tm7ZxNDyvJ…](https://suiscan.xyz/mainnet/tx/83tm7ZxNDyvJdT8ZPKMbTKG4AVT6HX7No4ygu8wzDtZM)
- `swap-sui-usdc` — 0.35 SUI → ~0.2469 USDC — [AeomHJYq9VtC…](https://suiscan.xyz/mainnet/tx/AeomHJYq9VtCwb22KX6BG9nLzYarwV2bnxah8tvNs4Gu)
- `swap-usdc-sui` — 0.2469 USDC → ~0.3252 SUI — [2c6PJjNHC3Xy…](https://suiscan.xyz/mainnet/tx/2c6PJjNHC3XyHpqSfsTNHkoHpfouVtHoCWjwFdewHSfZ)
- `swap-sui-usdc` — 0.35 SUI → ~0.2467 USDC — [Hq1ge5zKY4hk…](https://suiscan.xyz/mainnet/tx/Hq1ge5zKY4hkesTaMdjdKKg8iy9Jsn9stByKJUJ9HRKm)
- `swap-usdc-sui` — 0.2467 USDC → ~0.3251 SUI — [G6Mkj6F45AQM…](https://suiscan.xyz/mainnet/tx/G6Mkj6F45AQME58EtKKD7CXVqiV2Erm3usTaJm9FsQ5m)
- `swap-sui-usdc` — 0.35 SUI → ~0.2469 USDC — [AvHkGmAikKhS…](https://suiscan.xyz/mainnet/tx/AvHkGmAikKhSz4ohDjjebzZiGD66EDzgjELBVncppSuj)
- `swap-usdc-sui` — 0.2469 USDC → ~0.3251 SUI — [3dk3EVrdCbyv…](https://suiscan.xyz/mainnet/tx/3dk3EVrdCbyvynHjYf78y1pVT57sdfFdFywKyVssJ3Ts)
- `swap-sui-usdc` — 0.35 SUI → ~0.2469 USDC — [2koqt5TW4nb7…](https://suiscan.xyz/mainnet/tx/2koqt5TW4nb7AsDGDWvam6XhL8hMmtGvcW7zXKM9rDnh)
- `swap-usdc-sui` — 0.2469 USDC → ~0.3251 SUI — [Fn44eCUtQXf9…](https://suiscan.xyz/mainnet/tx/Fn44eCUtQXf9DTkNop4rWUGbVCnL5gTCmetYVBozF6dh)
- `swap-sui-usdc` — 0.35 SUI → ~0.2467 USDC — [8txetBwrpuNF…](https://suiscan.xyz/mainnet/tx/8txetBwrpuNFvyauGruKge61FyWdmNKRe2MFeJinnAXs)
- `swap-usdc-sui` — 0.2467 USDC → ~0.3251 SUI — [AMneqAx2QARR…](https://suiscan.xyz/mainnet/tx/AMneqAx2QARRsJRon1Vw2EKXANqyxzrNRWiLNg5vGU82)

## Deleverages
- `deleverage` — 25% · sell 0.854073 SUI → repay 0.5641 USDC — [C229P1srDRox…](https://suiscan.xyz/mainnet/tx/C229P1srDRoxheVoEBswTrhcifdLKvhALpoJwLFMRXHh)
- `deleverage` — 50% · sell 1.708146 SUI → repay 1.1282 USDC — [2b7nkNbi61fm…](https://suiscan.xyz/mainnet/tx/2b7nkNbi61fmd4zfrE4hcZz7q5u7ZdfsuQgQc15gWS4a)
- `deleverage` — 75% · sell 2.562219 SUI → repay 1.6922 USDC — [F4Knb8bo5Ma9…](https://suiscan.xyz/mainnet/tx/F4Knb8bo5Ma9gHhzgxGWdinLkEWKpZGr1SjSKmnLT417)

## Atomic revert-proofs (safety — aborted, zero balance moved)
- `impossible-minOut` — deleverage demanding 100× achievable USDC — aborted: MoveAbort(MoveLocation { module: ModuleId { address: 1e4a13a0494d5facdbe8473e74127b838c2d446ecec0ce262e2eddafa77259cb, name: Identifier("logic") }, function: 3, instruction: 13, function_name: Some("execute_repay") }, 1602) in command 3
- `below-floor` — deleverage on a sub-floor position — aborted: debt too small to deleverage
