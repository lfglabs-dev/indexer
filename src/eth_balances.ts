import {
  Block,
  EventWithTransaction,
  formatUnits,
  uint256,
} from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  ETH_CONTRACT,
  MONGO_CONNECTION_STRING,
  FINALITY,
  DECIMALS,
} from "./common/constants.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(ETH_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.TRANSFER)],
      includeTransaction: false,
      includeReceipt: false,
    },
  ],
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: 0,
  network: "starknet",
  filter,
  sinkType: "mongo",
  finality: FINALITY,
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "eth_balances",
    entityMode: true,
  },
};

export default function transform({ header, events }: Block) {
  if (!header) {
    console.log("missing header, unable to process", events.length, "events");
    return;
  }

  const output = events
    .map(({ event }: EventWithTransaction) => {
      const key = BigInt(event.keys[0]);

      switch (key) {
        case SELECTOR_KEYS.TRANSFER: {
          const from = event.data[0];
          const to = event.data[1];
          const real_value = uint256.uint256ToBN({
            low: event.data[2],
            high: event.data[3],
          });
          if (
            from ===
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          ) {
            return [
              {
                entity: { address: to },
                update: {
                  $set: {
                    balance: +formatUnits(real_value, DECIMALS),
                  },
                },
              },
            ];
          } else {
            return [
              {
                entity: { address: from },
                update: {
                  $inc: {
                    balance: +formatUnits(-real_value, DECIMALS),
                  },
                },
              },
              {
                entity: { address: to },
                update: {
                  $inc: {
                    balance: +formatUnits(real_value, DECIMALS),
                  },
                },
              },
            ];
          }
        }

        default:
          return;
      }
    })
    .filter(Boolean)
    .flat();

  return output;
}
