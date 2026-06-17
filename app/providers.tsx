// File: app/providers.tsx
"use client";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// DEV-008 (COSMETIC): dapp-kit bumped 0.16.16 -> 1.1.1 to match @mysten/sui v2 (DEV-002 skew).
// v2 moved `getFullnodeUrl` (@mysten/sui/client) to `getJsonRpcFullnodeUrl` (@mysten/sui/jsonRpc),
// and createNetworkConfig's NetworkConfig (= SuiJsonRpcClientOptions) now requires `network` + `url`.
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import "@mysten/dapp-kit/dist/index.css";

const { networkConfig } = createNetworkConfig({
  mainnet: { network: "mainnet", url: getJsonRpcFullnodeUrl("mainnet") },
});
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
