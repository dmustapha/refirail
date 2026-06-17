// File: lib/config.ts
// All source-verified Sui mainnet constants for RefiRail. See TECHNICAL-SPIKE.md for provenance.

export const RPC = {
  // JSON-RPC: SuiClient (signing, execution, dryRun)
  jsonRpc: process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io:443",
  // gRPC: SuilendClient.initialize REQUIRES a SuiGrpcClient in 3.0.x (NOT SuiClient)
  grpc: process.env.SUI_GRPC_URL || "https://fullnode.mainnet.sui.io:443",
} as const;

export const COINS = {
  SUI: "0x2::sui::SUI",
  // NATIVE Circle USDC (verified x4). NEVER use the wormhole type below.
  USDC: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  USDC_WORMHOLE_DO_NOT_USE:
    "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
  SUI_DECIMALS: 9,
  USDC_DECIMALS: 6,
} as const;

export const SUILEND = {
  // Main Pool — from @suilend/sdk@3.0.4 client.js
  LENDING_MARKET_ID:
    "0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1",
  LENDING_MARKET_TYPE:
    "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL",
} as const;

export const DEEPBOOK = {
  PACKAGE_ID:
    "0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748",
  REGISTRY_ID:
    "0xaf16199a2dff736e9f07a845f23c5da6df6f756eddb631aed9d24a93efc4549d",
  // SUI_USDC: base=SUI, quote=USDC -> use the *Quote* flash-loan + swap fns for USDC.
  SUI_USDC_POOL:
    "0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407",
  POOL_KEY: "SUI_USDC",
} as const;

export const NAVI = {
  SUI_ASSET_ID: 0,
  USDC_ASSET_ID: 10, // native USDC. assetId 1 = bridged/wormhole — DO NOT USE.
  CONFIG_URL: "https://open-api.naviprotocol.io/api/navi/config",
} as const;

export const PYTH = {
  SUI_USD_FEED:
    "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  USDC_USD_FEED:
    "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  STATE: "0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8",
  WORMHOLE_STATE:
    "0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c",
} as const;

export const EXPLORER = {
  tx: (digest: string) => `https://suiscan.xyz/mainnet/tx/${digest}`,
  object: (id: string) => `https://suiscan.xyz/mainnet/object/${id}`,
} as const;

export const DEMO = {
  // Set after open-position.ts opens the demo position. Read by the frontend for first-paint data.
  address: process.env.NEXT_PUBLIC_DEMO_ADDRESS || "",
} as const;
