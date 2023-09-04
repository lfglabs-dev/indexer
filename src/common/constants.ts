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
export const DECIMALS = 18;
