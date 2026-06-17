// File: lib/clients.ts
// DEV-005 (DEGRADED→adapted): ARCHITECTURE pins @mysten/sui ^1.30 where the JSON-RPC client is
// `SuiClient` at "@mysten/sui/client". Installed is 2.18.0 (DEV-002), a major API restructure:
//   - JSON-RPC client class -> `SuiJsonRpcClient` at "@mysten/sui/jsonRpc"
//   - ctor needs { network, url } (url requires network in the v2 options union)
//   - getFullnodeUrl -> getJsonRpcFullnodeUrl (unused here; RPC.jsonRpc is explicit)
//   - SuiGrpcClient ctor needs { network, baseUrl } (baseUrl alone runs but fails the type check)
// `SuiClient` is re-exported below as the project-wide alias so downstream files keep one name.
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { RPC } from "./config";

// Project-wide alias: every adapter/composer that referenced `SuiClient` imports this.
export type SuiClient = SuiJsonRpcClient;

export function makeSuiClient(): SuiJsonRpcClient {
  return new SuiJsonRpcClient({ network: "mainnet", url: RPC.jsonRpc });
}

// @suilend/sdk@3.0.4 init needs this gRPC client (3.0.x 4th-arg type IS SuiGrpcClient).
// v2 options require `network` alongside the GrpcWeb `baseUrl` (verified: node_modules/@mysten/sui/dist/grpc/client.d.mts).
export function makeSuiGrpcClient(): SuiGrpcClient {
  return new SuiGrpcClient({ network: "mainnet", baseUrl: RPC.grpc });
}

// Demo signer only. NEVER ship a real key to the browser — scripts/server use only.
export function makeDemoKeypair(): Ed25519Keypair {
  const secret = process.env.DEMO_PRIVATE_KEY;
  if (!secret) throw new Error("DEMO_PRIVATE_KEY not set");
  // suiprivkey... bech32 form
  return Ed25519Keypair.fromSecretKey(secret);
}
