import {
  Block,
  EventWithTransaction,
  uint256,
} from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  MONGO_CONNECTION_STRING,
  ETH_CONTRACT,
  AUTO_RENEW_CONTRACT,
  AR_FINALITY,
} from "./common/constants.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(ETH_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_APPROVE)],
    },
  ],
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("STARTING_BLOCK")),
  network: "starknet",
  filter,
  finality: AR_FINALITY,
  sinkType: "mongo",
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "auto_renew_approvals",
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
        case SELECTOR_KEYS.ON_APPROVE: {
          const renewer = event.data[0];
          const spender = event.data[1];
          const allowance = uint256.uint256ToBN({
            low: event.data[2],
            high: event.data[3],
          });

          if (BigInt(spender) != AUTO_RENEW_CONTRACT) {
            return;
          }

          return {
            entity: { renewer },
            update: [
              {
                $set: {
                  renewer,
                  allowance: "0x" + allowance.toString(16),
                },
              },
            ],
          };
        }

        // should not happen
        default:
          return;
      }
    })
    .filter(Boolean);

  return output;
}
