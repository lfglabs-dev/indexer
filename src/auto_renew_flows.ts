import {
  Block,
  EventWithTransaction,
  uint256,
  formatUnits,
} from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  MONGO_CONNECTION_STRING,
  AUTO_RENEW_CONTRACT,
  DECIMALS,
} from "./common/constants.ts";
import { decodeDomain } from "./common/starknetid.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(AUTO_RENEW_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_AUTO_RENEW_ENABLED)],
    },
    {
      fromAddress: formatFelt(AUTO_RENEW_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_AUTO_RENEW_DISABLED)],
    },
    {
      fromAddress: formatFelt(AUTO_RENEW_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_AUTO_RENEW)],
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
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "auto_renew_flows",
    entityMode: true,
  },
};

export default function transform({ events }: Block) {
  const output = events
    .map(({ event }: EventWithTransaction) => {
      const key = BigInt(event.keys[0]);

      switch (key) {
        case SELECTOR_KEYS.ON_AUTO_RENEW_ENABLED: {
          const domain = decodeDomain([BigInt(event.keys[1])]);

          const renewerAddr = event.data[0];
          const limitPrice = event.data[1];
          const metaHash = event.data[3];

          return {
            entity: {
              domain,
              renewer_address: renewerAddr,
              limit_price: limitPrice,
            },
            update: [
              {
                $set: {
                  domain,
                  renewer_address: renewerAddr,
                  limit_price: limitPrice,
                  enabled: true,
                  last_renewal: 0,
                  meta_hash: metaHash,
                },
              },
            ],
          };
        }

        case SELECTOR_KEYS.ON_AUTO_RENEW_DISABLED: {
          const domain = decodeDomain([BigInt(event.keys[1])]);
          const renewerAddr = event.data[0];
          const limitPrice = event.data[1];

          return {
            entity: {
              domain,
              renewer_address: renewerAddr,
              limit_price: limitPrice,
            },
            update: [
              {
                $set: {
                  domain,
                  renewer_address: renewerAddr,
                  limit_price: limitPrice,
                  enabled: false,
                },
              },
            ],
          };
        }

        case SELECTOR_KEYS.ON_AUTO_RENEW: {
          const domain = decodeDomain([BigInt(event.keys[1])]);
          const renewerAddr = event.data[0];
          const limitPrice = formatUnits(
            uint256.uint256ToBN({ low: event.data[2], high: event.data[3] }),
            DECIMALS
          );
          const timestamp = event.data[4];

          return {
            entity: {
              domain,
              renewer_address: renewerAddr,
              limit_price: +limitPrice,
            },
            update: [
              {
                $set: {
                  last_renewal: +timestamp,
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
