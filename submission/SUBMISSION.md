# RefiRail — DeepSurge submission

Fill the DeepSurge form from this file. Sui Overflow 2026, DeepBook track.

## Name
RefiRail

## Tagline (one line)
Manage your Sui lending position in one click. Move it to a cheaper rate or de-risk it, as a single atomic transaction with zero upfront capital.

## Logo
`submission/logo.png` (1024x1024) or `submission/logo.jpg` (512x512). 1:1, brand-matched.

## Links
- Live app: https://refirail.vercel.app
- GitHub (public): https://github.com/dmustapha/refirail
- Demo video: <PASTE YOUTUBE URL AFTER UPLOAD>
- Network: Sui mainnet

## Demo video (ready to upload)
- File: `video/out/demo.mp4` (1:46, 1920x1080, with narration). Vertical social clip: `video/out/social.mp4`.
- YouTube title: RefiRail — one-click atomic lending refinance + deleverage on Sui (DeepBook)
- YouTube description:
  RefiRail manages a Sui lending position in one click. Move a loan to the cheapest money market, or pay down risk, as a single atomic transaction with zero upfront capital, powered by a fee-free DeepBook flash loan. Best-rate router across Navi, Suilend, and AlphaLend. Proven on Sui mainnet.
  Live: https://refirail.vercel.app
  Code: https://github.com/dmustapha/refirail
  Sui Overflow 2026, DeepBook track.

## Short description
RefiRail turns a multi-step, capital-gated DeFi chore into one click. It moves a lending position to a cheaper money market, or pays down risk, inside a single Programmable Transaction Block that reverts if it would ever leave you worse off. No upfront capital, because a fee-free DeepBook flash loan front-runs the whole sequence.

## Full description
A borrower on Sui who is stuck at a high rate cannot easily move their loan. The unwind is repay debt, free collateral, redeposit, reborrow, and it needs capital you do not have while your collateral is still locked, across several separately signed transactions where a failure midway can leave you under-collateralized.

RefiRail collapses that into one atomic transaction. It does two things:

1. Reduce my risk (deleverage). Pay down a chosen slice of your USDC debt using your SUI collateral, routed through DeepBook. Your health factor rises and you see it before you sign.
2. Move to a cheaper rate (refinance, the headline). RefiRail is a best-rate router. It reads the live borrow APR at Suilend and AlphaLend and moves your Navi loan into whichever is cheaper, in one PTB. You can also pick the destination yourself.

Both run as a server-side dry-run against live mainnet first, so the app only ever hands your wallet a transaction that has already been proven not to abort.

## How it uses DeepBook (the track integration)
DeepBook is the engine that makes the zero-capital, fee-free atomic flow possible:
- Fee-free flash loan. Every operation opens with a DeepBook flash borrow of USDC. The flash primitive is fee-free, so there is no capital requirement and no flash fee dragging the economics.
- Fee-free two-hop swap. The deleverage sells SUI for USDC by routing SUI to DEEP to USDC through DeepBook's whitelisted DEEP/SUI and DEEP/USDC pairs. That costs 0 DEEP in fees, versus a direct SUI/USDC swap that would charge a DEEP taker fee the wallet does not hold. The app's live order-book panel shows both routes and highlights the fee-free winner.
- Live order-book reads. Mid price, route comparison, and depth come straight from DeepBook v3.

## Multi-lender router (what is new)
RefiRail composes four real Sui money markets at the PTB layer: Navi as the source, and Suilend or AlphaLend as the destination, chosen by live APR. Adding AlphaLend required dropping to its Move layer (create_position, add_collateral, borrow returning a LiquidityPromise, fulfill_promise) with an in-PTB Pyth price refresh, all threaded into one DeepBook-flash-wrapped transaction.

## Proven on Sui mainnet (real transactions)
No testnet, no mocks. Full ledger in `submission/proof.md` and `submission/proof-alphalend.md`.
- Atomic deleverage (DeepBook flash + fee-free two-hop): https://suiscan.xyz/mainnet/tx/4S5bhsgZhsrwjaavUNBAZKyDwWKxKfruUTUXD6jT3S8K
- Atomic refinance, Navi to Suilend: https://suiscan.xyz/mainnet/tx/BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK
- Atomic refinance, Navi to AlphaLend (the multi-lender router): https://suiscan.xyz/mainnet/tx/3UgVGY2ydYTRsQFAV7MFpxFe9frnFgJVFPhxbyFKuvL6

## Deployment / Package ID
RefiRail deploys zero net-new Move. It is composition-only: the entire product is built at the PTB layer over existing audited protocols, which is itself the technical thesis (no new attack surface). There is therefore no RefiRail Move package to register. If the form requires a Package ID, use the protocols it composes, or point to the proof transactions above, which show all of them invoked inside one atomic tx:
- DeepBook v3 package: 0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748
- DeepBook SUI_USDC pool: 0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407
- Suilend Main Pool market: 0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1
- AlphaLend package: 0xe48b33ef41d56e04fc42bf558e4d54d7cae8a363da9054a6c24bafc2c53a4f33
- Native USDC: 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC

## Judging fit (core: 50% real-world, 20% product/UX, 20% technical, 10% presentation)
- Real-world: a real pain (loans stuck at the wrong rate), solved for real on mainnet, usable today.
- Product/UX: one click, live health preview, best-rate routing, honest empty states, no fabricated numbers.
- Technical: four protocols in one reverting PTB, the AlphaLend Move-layer oracle composition, zero net-new Move.
- Presentation: working live URL, demo video, three on-chain proof transactions.
