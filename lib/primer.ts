// File: lib/primer.ts
// Replay-protection primer.
//
// Sui rejects a transaction whose inputs are all shared/immutable (no address-owned object input)
// unless it carries a `ValidDuring` expiration: "Transactions must either have address-owned inputs,
// or a ValidDuring expiration with at most two epochs of validity." Our flash-loan PTBs are exactly
// that shape (DeepBook pool, Navi/Suilend pools, oracles are all shared), so a wallet that pays gas
// from an address balance trips the rule.
//
// We cannot satisfy it with ValidDuring because older wallet @mysten/sui builds cannot parse that
// expiration variant (they throw "Invalid type: Expected Object but received Object"). So we satisfy
// the OTHER branch instead: give the PTB one address-owned input by referencing a spare owned coin
// and transferring it back to the sender (economically a no-op). That provides replay protection and
// lets the intent keep a `None` expiration, which every wallet version accepts. See lib/intent.ts.
import type { Transaction } from "@mysten/sui/transactions";
import type { SuiClient } from "./clients";

export async function addReplayProtectionPrimer(
  tx: Transaction,
  suiClient: SuiClient,
  sender: string,
): Promise<boolean> {
  const { data } = await suiClient.getAllCoins({ owner: sender });
  // Prefer a non-SUI coin so the primer never collides with the SUI coin the wallet smashes for gas.
  const primer = data.find((c) => !c.coinType.endsWith("::sui::SUI"))
    // Fall back to a secondary SUI coin (smallest, least likely to be chosen as gas) if that is all
    // the sender holds and there is more than one.
    ?? (() => {
      const sui = data
        .filter((c) => c.coinType.endsWith("::sui::SUI"))
        .sort((a, b) => (BigInt(a.balance) < BigInt(b.balance) ? -1 : 1));
      return sui.length > 1 ? sui[0] : undefined;
    })();
  if (!primer) return false;
  tx.transferObjects([tx.object(primer.coinObjectId)], sender);
  return true;
}
