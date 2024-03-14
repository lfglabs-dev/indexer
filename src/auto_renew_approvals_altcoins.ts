import { Block, EventWithTransaction, uint256 } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  MONGO_CONNECTION_STRING,
  AUTO_RENEW_ALTCOINS_STRINGS,
  AR_FINALITY,
  STRK_CONTRACT,
  USDC_CONTRACT,
  USDT_CONTRACT,
} from "./common/constants.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(STRK_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_APPROVE)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(USDC_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_APPROVE)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(USDT_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_APPROVE)],
      includeTransaction: false,
      includeReceipt: false,
    },
  ],
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("AR_ALTCOINS_STARTING_BLOCK")),
  network: "starknet",
  filter,
  finality: AR_FINALITY,
  sinkType: "mongo",
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "auto_renew_approvals_altcoins",
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
          const renewer = event.keys[1];
          const spender = event.keys[2];
          const allowance = uint256.uint256ToBN({
            low: event.data[0],
            high: event.data[1],
          });
          const contract = event.fromAddress;

          if (!AUTO_RENEW_ALTCOINS_STRINGS.includes(BigInt(spender))) {
            return;
          }

          return {
            entity: { renewer },
            update: [
              {
                $set: {
                  renewer,
                  allowance: "0x" + allowance.toString(16),
                  erc20_addr: contract,
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
