import { hash } from "../deps.ts";

export function formatKey(key: bigint): string {
  return "0x" + key.toString(16);
}

export const SELECTOR_KEYS = {
  TRANSFER: BigInt(hash.getSelectorFromName("Transfer")),
  STARK_UPDATE: BigInt(hash.getSelectorFromName("starknet_id_update")),
  AUTO_RENEW: BigInt(hash.getSelectorFromName("domain_renewed")),
  REFERRAL: BigInt(hash.getSelectorFromName("on_commission")),
};

export const MONGO_CONNECTION_STRING = Deno.env.get(
  "MONGO_CONNECTION_STRING"
) as string;
export const NAMING_CONTRACT = BigInt(
  Deno.env.get("NAMING_CONTRACT") as string
);
export const DECIMALS = 18;
