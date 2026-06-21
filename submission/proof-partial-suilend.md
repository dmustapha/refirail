# RefiRail — On-chain Proof: PARTIAL refinance Navi -> suilend

A real, atomic **partial** refinance on Sui mainnet: 30% of a live Navi loan
moved to suilend in ONE PTB (DeepBook flash + Navi repay/withdraw + suilend deposit/borrow, oracle-refreshed),
leaving the remainder on Navi at the same loan-to-value. Reverts atomically if any leg fails.

- **Digest:** `8djvtzLpTa36oLUYs2jWGzTsExRd7HQdDb46WBUbF3WF`
- **Suiscan:** [8djvtzLpTa36oLUYs2jWGzTsExRd7HQdDb46WBUbF3WF](https://suiscan.xyz/mainnet/tx/8djvtzLpTa36oLUYs2jWGzTsExRd7HQdDb46WBUbF3WF)
- **Status:** `success`
- **Sender:** `0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3`
- **Moved:** 30% of (5.000080672 SUI collateral / 1.504613 USDC debt) Navi -> suilend
