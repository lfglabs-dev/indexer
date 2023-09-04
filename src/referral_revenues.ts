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
} from "./common/constants.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(REFERRAL_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_COMMISSION)],
    },
    {
      fromAddress: formatFelt(REFERRAL_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_CLAIM)],
    },
  ],
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  sinkOptions: {
    database: "starknetid",
    collectionName: "referral_revenues",
    entityMode: false,
  },
};

export default function transform({ header, events }: Block) {
  const output = events.map(({ event }: EventWithTransaction) => {
    const timestamp = event.data[0];
    const amount = formatUnits(
      uint256.uint256ToBN({ low: event.data[1], high: event.data[2] }),
      DECIMALS
    );
    const sponsorAddr = event.data[3];
    const key = BigInt(event.keys[0]);

    switch (key) {
      case SELECTOR_KEYS.ON_COMMISSION:
        return { timestamp: +timestamp, sponsor_addr: sponsorAddr, amount };

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
