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

  ON_AUTO_RENEW_UPDATED: BigInt(hash.getSelectorFromName("UpdatedRenewal")),
  ON_AUTO_RENEW_DISABLED: BigInt(hash.getSelectorFromName("DisabledRenewal")),
  ON_AUTO_RENEW: BigInt(hash.getSelectorFromName("DomainRenewed")),

  ON_APPROVE: BigInt(hash.getSelectorFromName("Approval")),

  OLD_DOMAIN_UPDATE: BigInt(hash.getSelectorFromName("starknet_id_update")),
  OLD_DOMAIN_RESOLVER_UPDATE: BigInt(
    hash.getSelectorFromName("domain_to_resolver_update")
  ),
  OLD_DOMAIN_TRANSFER: BigInt(hash.getSelectorFromName("domain_transfer")),
  OLD_DOMAIN_ADDR_UPDATE: BigInt(
    hash.getSelectorFromName("domain_to_addr_update")
  ),
  OLD_DOMAIN_REV_ADDR_UPDATE: BigInt(
    hash.getSelectorFromName("addr_to_domain_update")
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
export const AUTO_RENEW_CONTRACT = BigInt(
  Deno.env.get("AUTO_RENEW_CONTRACT") as string
);
export const ETH_CONTRACT = BigInt(Deno.env.get("ETH_CONTRACT") as string);
export const DECIMALS = 18;

// Load CUSTOM_RESOLVERS_LEN from the environment.
const CUSTOM_RESOLVERS_LEN = parseInt(
  Deno.env.get("CUSTOM_RESOLVERS_LEN") as string
);

// Dynamically retrieve each resolver and store it in an array.
export const CUSTOM_RESOLVERS_STRINGS: bigint[] = [];

for (let i = 0; i < CUSTOM_RESOLVERS_LEN; i++) {
  const resolverEnvName = `CUSTOM_RESOLVER_${i}`;
  const resolverStr = Deno.env.get(resolverEnvName) as string;
  CUSTOM_RESOLVERS_STRINGS.push(BigInt(resolverStr));
}
