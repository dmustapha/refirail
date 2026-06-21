// File: lib/intent.ts
// Serialize a built PTB into a wallet-signable intent (JSON), with one critical normalization.
//
// `tx.build()` on a mainnet client stamps the transaction with the NEW `ValidDuring` expiration
// variant ({ minEpoch, maxEpoch, chain, nonce }). @mysten/sui >= ~2.19 understands it, but many
// browser wallet extensions still bundle an OLDER @mysten/sui (1.45.x) whose `TransactionExpiration`
// schema only knows `None` and `Epoch`. When such a wallet reconstructs our intent it throws the
// valibot error "Invalid type: Expected Object but received Object" and the user can never sign.
//
// Reproduced exactly: Transaction.from(thisIntent) succeeds on 2.19 and throws that message on
// 1.45.2. Normalizing the expiration to `None` makes every installed version accept it, and is also
// the correct semantics for an interactively-signed tx: it must not expire at a fixed epoch while
// the user reviews the wallet prompt. Expiration is tx-validity metadata only, independent of the
// PTB commands, so this does not change the dry-run-verified outcome.
import type { Transaction } from "@mysten/sui/transactions";

export async function serializeSignableIntent(tx: Transaction): Promise<string> {
  const json = JSON.parse(await tx.toJSON());
  json.expiration = { None: true };
  return JSON.stringify(json);
}
