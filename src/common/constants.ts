import { hash } from "./deps.ts";

export function formatFelt(key: bigint): string {
  return "0x" + key.toString(16);
}

export const SELECTOR_KEYS = {
  TRANSFER: BigInt(hash.getSelectorFromName("Transfer")),
  USER_DATA_UPDATE: BigInt(hash.getSelectorFromName("UserDataUpdate")),
  VERIFIER_DATA_UPDATE: BigInt(hash.getSelectorFromName("VerifierDataUpdate")),
  ON_COMMISSION: BigInt(hash.getSelectorFromName("on_commission")),
  ON_CLAIM: BigInt(hash.getSelectorFromName("on_claim")),
  OLD_DOMAIN_UPDATE: BigInt(hash.getSelectorFromName("starknet_id_update")),
  OLD_DOMAIN_RESOLVER_UPDATE: BigInt(
    hash.getSelectorFromName("domain_to_resolver_update")
  ),
  OLD_DOMAIN_TRANSFER: BigInt(hash.getSelectorFromName("domain_transfer")),
  OLD_DOMAIN_ADDR_UPDATE: BigInt(
    hash.getSelectorFromName("domain_to_addr_update")
  ),
  OLD_SUBDOMAINS_RESET: BigInt(
    hash.getSelectorFromName("reset_subdomains_update")
  ),
};

export const MONGO_CONNECTION_STRING = Deno.env.get(
  "MONGO_CONNECTION_STRING"
) as string;
export const IDENTITY_CONTRACT = BigInt(
  Deno.env.get("IDENTITY_CONTRACT") as string
);
export const REFERRAL_CONTRACT = BigInt(
  Deno.env.get("REFERRAL_CONTRACT") as string
);
export const NAMING_CONTRACT = BigInt(
  Deno.env.get("NAMING_CONTRACT") as string
);
export const DECIMALS = 18;
