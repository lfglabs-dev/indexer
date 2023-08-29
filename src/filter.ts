import { formatKey, SELECTOR_KEYS } from "./utils/constants.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: Deno.env.get("ETH_CONTRACT"),
      keys: [formatKey(SELECTOR_KEYS.TRANSFER)],
    },
    {
      fromAddress: Deno.env.get("NAMING_CONTRACT"),
      keys: [formatKey(SELECTOR_KEYS.STARK_UPDATE)],
    },
    {
      fromAddress: Deno.env.get("REFERRAL_CONTRACT"),
      keys: [formatKey(SELECTOR_KEYS.REFERRAL)],
    },
    {
      fromAddress: Deno.env.get("RENEWAL_CONTRACT"),
      keys: [formatKey(SELECTOR_KEYS.AUTO_RENEW)],
    },
  ],
};

export default filter;
