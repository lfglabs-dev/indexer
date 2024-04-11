import { hash } from "./deps.ts";

export function formatFelt(key: bigint): string {
  return "0x" + key.toString(16);
}

export const SELECTOR_KEYS = {
  TRANSFER: BigInt(hash.getSelectorFromName("Transfer")),
  USER_DATA_UPDATE: BigInt(hash.getSelectorFromName("UserDataUpdate")),
  VERIFIER_DATA_UPDATE: BigInt(hash.getSelectorFromName("VerifierDataUpdate")),
  EXTENDED_VERIFIER_DATA_UPDATE: BigInt(
    hash.getSelectorFromName("ExtendedVerifierDataUpdate")
  ),
  ON_MAIN_ID_UPDATE: BigInt(hash.getSelectorFromName("MainIdUpdate")),
  ON_COMMISSION: BigInt(hash.getSelectorFromName("OnCommission")),
  ON_CLAIM: BigInt(hash.getSelectorFromName("OnClaim")),

  ON_AUTO_RENEW_UPDATED: BigInt(hash.getSelectorFromName("UpdatedRenewal")),
  ON_AUTO_RENEW_DISABLED: BigInt(hash.getSelectorFromName("DisabledRenewal")),
  ON_AUTO_RENEW: BigInt(hash.getSelectorFromName("DomainRenewed")),

  ON_APPROVE: BigInt(hash.getSelectorFromName("Approval")),

  DOMAIN_MINT: BigInt(hash.getSelectorFromName("DomainMint")),
  DOMAIN_RENEWAL: BigInt(hash.getSelectorFromName("DomainRenewal")),
  DOMAIN_TRANSFER: BigInt(hash.getSelectorFromName("DomainTransfer")),
  DOMAIN_MIGRATED: BigInt(hash.getSelectorFromName("DomainMigrated")),
  DOMAIN_TO_RESOLVER_UPDATE: BigInt(
    hash.getSelectorFromName("DomainResolverUpdate")
  ),
  DOMAIN_REV_ADDR_UPDATE: BigInt(
    hash.getSelectorFromName("AddressToDomainUpdate")
  ),
  DOMAIN_SALE_METADATA: BigInt(hash.getSelectorFromName("SaleMetadata")),

  SUBDOMAINS_RESET: BigInt(hash.getSelectorFromName("SubdomainsReset")),
  LEGACY_DOMAIN_TO_ADDR_CLEAR: BigInt(
    hash.getSelectorFromName("LegacyDomainToAddressClear")
  ),
  EQUIPMENT_UPDATED: BigInt(hash.getSelectorFromName("EquipmentUpdated")),
  ASSET_MINTED: BigInt(hash.getSelectorFromName("AssetMinted")),
  ASSET_BURNT: BigInt(hash.getSelectorFromName("AssetBurnt")),
  CUSTOM_RESOLVER_ADDRESS_UPDATE: BigInt(
    hash.getSelectorFromName("DomainToAddressUpdate")
  ),
  OFFCHAIN_RESOLVER_UPDATE: BigInt(
    hash.getSelectorFromName("StarknetIDOffChainResolverUpdate")
  ),
  OLD_DOMAIN_UPDATE: BigInt(hash.getSelectorFromName("starknet_id_update")),
  OLD_DOMAIN_RESOLVER_UPDATE: BigInt(
    hash.getSelectorFromName("domain_to_resolver_update")
  ),
  OLD_DOMAIN_TRANSFER: BigInt(hash.getSelectorFromName("domain_transfer")),
  OLD_DOMAIN_ADDR_UPDATE: BigInt(
    hash.getSelectorFromName("domain_to_addr_update")
  ),
  CUSTOM_RESOLVER_UPDATE: BigInt(
    hash.getSelectorFromName("CustomResolverUpdate")
  ),
  OLD_DOMAIN_REV_ADDR_UPDATE: BigInt(
    hash.getSelectorFromName("addr_to_domain_update")
  ),
  OLD_SUBDOMAINS_RESET: BigInt(
    hash.getSelectorFromName("reset_subdomains_update")
  ),
};

export const FINALITY = Deno.env.get("DEFAULT_FINALITY") as string;
export const STARKNET_QUEST_MONGODB_CONNECTION_STRING = Deno.env.get(
  "STARKNET_QUEST_MONGODB_CONNECTION_STRING"
) as string;
export const AR_FINALITY = Deno.env.get("AR_FINALITY") as string;
export const ID_UPGRADE_A_BLOCK = Number(Deno.env.get("ID_UPGRADE_A_BLOCK"));
export const NAMING_UPGRADE_A_BLOCK = Number(
  Deno.env.get("NAMING_UPGRADE_A_BLOCK")
);
export const MONGO_CONNECTION_STRING = Deno.env.get(
  "MONGO_CONNECTION_STRING"
) as string;
export const IDENTITY_CONTRACT = BigInt(
  Deno.env.get("IDENTITY_CONTRACT") as string
);
export const QUEST_DATABASE = Deno.env.get("QUEST_DATABASE") as string;
export const BOOST_STARTING_BLOCK = BigInt(
  Deno.env.get("BOOST_STARTING_BLOCK") as string
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
export const BOOST_CONTRACT = BigInt(Deno.env.get("BOOST_CONTRACT") as string);
export const QUEST_NFT_CONTRACT = BigInt(
  Deno.env.get("QUEST_NFT_CONTRACT") as string
);
export const ETH_CONTRACT = BigInt(Deno.env.get("ETH_CONTRACT") as string);
export const STRK_CONTRACT = BigInt(Deno.env.get("STRK_CONTRACT") as string);
export const USDC_CONTRACT = BigInt(Deno.env.get("USDC_CONTRACT") as string);
export const USDT_CONTRACT = BigInt(Deno.env.get("USDT_CONTRACT") as string);
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

// Load AUTO_RENEW_ALTCOINS_CONTRACTS_LEN from the environment.
const AUTO_RENEW_ALTCOINS_CONTRACTS_LEN = parseInt(
  Deno.env.get("AUTO_RENEW_ALTCOINS_CONTRACTS_LEN") as string
);

// Dynamically retrieve each auto renewal altcoin contract and store it in an array.
export const AUTO_RENEW_ALTCOINS_STRINGS: bigint[] = [];

for (let i = 0; i < AUTO_RENEW_ALTCOINS_CONTRACTS_LEN; i++) {
  const autoRenewAltcoinEnvName = `AUTO_RENEW_ALTCOIN_CONTRACT_${i}`;
  const resolverStr = Deno.env.get(autoRenewAltcoinEnvName) as string;
  AUTO_RENEW_ALTCOINS_STRINGS.push(BigInt(resolverStr));
}

const TOKEN_CONTRACTS_LEN = parseInt(
  Deno.env.get("TOKEN_CONTRACTS_LEN") as string
);

// Dynamically retrieve each token contract
export const TOKEN_CONTRACTS: string[] = [];

for (let i = 0; i < TOKEN_CONTRACTS_LEN; i++) {
  const tokenContractEnvName = `TOKEN_CONTRACT_${i}`;
  const tokenContract = Deno.env.get(tokenContractEnvName) as string;
  TOKEN_CONTRACTS.push(tokenContract);
}
