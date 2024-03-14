import {
  Block,
  EventWithTransaction,
  uint256,
  formatUnits,
} from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  REFERRAL_CONTRACT,
  DECIMALS,
  MONGO_CONNECTION_STRING,
  FINALITY,
} from "./common/constants.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(REFERRAL_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_COMMISSION)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(REFERRAL_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_CLAIM)],
      includeTransaction: false,
      includeReceipt: false,
    },
  ],
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("REFERRAL_CONTRACT_STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  finality: FINALITY,
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "referral_revenues",
    entityMode: false,
  },
};

export default function transform({ events }: Block) {
  const output = events.map(({ event }: EventWithTransaction) => {
    const timestamp = event.data[0];
    const amount = formatUnits(
      uint256.uint256ToBN({ low: event.data[1], high: event.data[2] }),
      DECIMALS
    );
    const sponsorAddr = event.data[3];
    const key = BigInt(event.keys[0]);

    switch (key) {
      case SELECTOR_KEYS.ON_COMMISSION: {
        const sponsoredAddr = event.data[4];
        return {
          timestamp: +timestamp,
          sponsor_addr: sponsorAddr,
          sponsored_addr: sponsoredAddr,
          amount,
        };
      }

      case SELECTOR_KEYS.ON_CLAIM:
        return {
          timestamp: +timestamp,
          sponsor_addr: sponsorAddr,
          amount: +("-" + amount),
        };

      // should not happen
      default:
        return;
    }
  });
  return output;
}
