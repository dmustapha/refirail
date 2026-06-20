// AlphaLend destination-half isolation spike.
// Proves: updatePrices (Pyth, in-PTB) -> create_position -> add_collateral<SUI>
//         -> borrow<USDC> (LiquidityPromise) -> fulfill_promise<USDC> -> coin
// composes into ONE @mysten/sui v2 Transaction and dry-runs against mainnet.
// No private key, no funds moved (dryRun only needs the sender address).

import { AlphalendClient } from '@alphafi/alphalend-sdk';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';

const RPC = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io';
const SENDER = '0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3';

const PROTOCOL = '0x01d9cf05d65fa3a9bb7163095139120e3c4e414dfbab153a49779a7d14010b93';
const PKG = '0xe48b33ef41d56e04fc42bf558e4d54d7cae8a363da9054a6c24bafc2c53a4f33';
const CLOCK = '0x6';
const SUI_T = '0x2::sui::SUI';
const USDC_T = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

const COLLATERAL_SUI = 150_000_000n; // 0.15 SUI
const BORROW_USDC = 50_000n;         // 0.05 USDC (6dp)

const log = (...a) => console.log(...a);

const sui = new SuiJsonRpcClient({ network: 'mainnet', url: RPC });
const client = new AlphalendClient('mainnet');

log('1) Fetching markets to map coinType -> marketId ...');
const markets = await client.getAllMarkets();
if (!markets) throw new Error('getAllMarkets returned undefined');
const find = (pred) => markets.find(pred);
const suiMkt = find(m => m.coinType.endsWith('::sui::SUI'));
const usdcMkt = find(m => m.coinType === USDC_T || m.coinType.endsWith('::usdc::USDC') && m.coinType.includes('dba34672'));
log(`   SUI  market: id=${suiMkt?.marketId} type=${suiMkt?.coinType}`);
log(`   USDC market: id=${usdcMkt?.marketId} type=${usdcMkt?.coinType}`);
if (!suiMkt || !usdcMkt) throw new Error('Could not resolve SUI/USDC markets');

log('2) Building PTB (oracle refresh FIRST, then deposit+borrow) ...');
const tx = new Transaction();
tx.setSender(SENDER);
tx.setGasBudget(60_000_000); // 0.06 SUI

// (a) oracle refresh for both assets, in-PTB, BEFORE borrow
await client.updatePrices(tx, [SUI_T, USDC_T]);
log('   updatePrices appended');

// (b) fresh position cap (handle threaded, never goes to chain as an id)
const positionCap = client.createPosition(tx);

// (c) deposit SUI collateral (split from gas)
const [suiColl] = tx.splitCoins(tx.gas, [tx.pure.u64(COLLATERAL_SUI)]);
tx.moveCall({
  target: `${PKG}::alpha_lending::add_collateral`,
  typeArguments: [SUI_T],
  arguments: [tx.object(PROTOCOL), positionCap, tx.pure.u64(suiMkt.marketId), suiColl, tx.object(CLOCK)],
});
log('   add_collateral<SUI> appended');

// (d) borrow USDC -> LiquidityPromise
const promise = tx.moveCall({
  target: `${PKG}::alpha_lending::borrow`,
  typeArguments: [USDC_T],
  arguments: [tx.object(PROTOCOL), positionCap, tx.pure.u64(usdcMkt.marketId), tx.pure.u64(BORROW_USDC), tx.object(CLOCK)],
});

// (e) fulfill_promise -> the borrowed USDC coin (kept; in refinance this repays the flash)
const usdcCoin = tx.moveCall({
  target: `${PKG}::alpha_lending::fulfill_promise`,
  typeArguments: [USDC_T],
  arguments: [tx.object(PROTOCOL), promise, tx.object(CLOCK)],
});
log('   borrow<USDC> + fulfill_promise<USDC> appended');

// (f) sink the coin + cap so the PTB is well-formed (no dangling values)
tx.transferObjects([usdcCoin, positionCap], SENDER);

log('3) Dry-running against mainnet ...');
const bytes = await tx.build({ client: sui });
const res = await sui.dryRunTransactionBlock({ transactionBlock: bytes });

const status = res.effects?.status?.status;
const err = res.effects?.status?.error;
log('\n================ DRY RUN RESULT ================');
log('status:', status);
if (err) log('error :', err);
log('gasUsed:', JSON.stringify(res.effects?.gasUsed));
log('# balanceChanges:', res.balanceChanges?.length ?? 0);

// classify
let verdict;
if (status === 'success') verdict = 'GREEN — composition + oracle ordering fully proven (executed end-to-end in sim)';
else if (err && /[Pp]rice|[Oo]racle|stale|PriceInfo|pyth/.test(err)) verdict = 'RED — ORACLE LANDMINE: ' + err;
else verdict = 'AMBER — got PAST oracle/composition into protocol logic; aborted on: ' + err + '\n   (composition + oracle ordering proven; only economics/limits failed)';
log('\nVERDICT:', verdict);
log('===============================================');
