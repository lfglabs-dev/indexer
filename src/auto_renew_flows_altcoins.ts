import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  MONGO_CONNECTION_STRING,
  AUTO_RENEW_ALTCOINS_CONTRACTS,
  AR_FINALITY,
} from "./common/constants.ts";
import { decodeDomain } from "./common/starknetid.ts";

const filter = {
  header: { weak: true },
  events: AUTO_RENEW_ALTCOINS_CONTRACTS.flatMap((contract) => [
    {
      fromAddress: formatFelt(contract),
      keys: [formatFelt(SELECTOR_KEYS.ON_AUTO_RENEW_UPDATED)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(contract),
      keys: [formatFelt(SELECTOR_KEYS.ON_AUTO_RENEW_DISABLED)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(contract),
      keys: [formatFelt(SELECTOR_KEYS.ON_AUTO_RENEW)],
      includeTransaction: false,
      includeReceipt: false,
    },
  ]),
};
console.log("filter", filter);

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("AR_ALTCOINS_STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  finality: AR_FINALITY,
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "auto_renew_flows_altcoins",
    entityMode: true,
  },
};

export default function transform({ events }: Block) {
  const output = events
    .map(({ event }: EventWithTransaction) => {
      const key = BigInt(event.keys[0]);

      switch (key) {
        case SELECTOR_KEYS.ON_AUTO_RENEW_UPDATED: {
          const contract = event.fromAddress;
          const domain = decodeDomain([BigInt(event.keys[1])]);

          const renewerAddr = event.data[0];
          const allowance = event.data[1];
          const metaHash = event.data[3];

          return {
            entity: {
              domain,
              renewer_address: renewerAddr,
            },
            update: [
              {
                $set: {
                  domain,
                  renewer_address: renewerAddr,
                  allowance,
                  enabled: true,
                  last_renewal: 0,
                  meta_hash: metaHash,
                  auto_renew_contract: contract,
                },
              },
            ],
          };
        }

        case SELECTOR_KEYS.ON_AUTO_RENEW_DISABLED: {
          const contract = event.fromAddress;
          const domain = decodeDomain([BigInt(event.keys[1])]);
          const renewerAddr = event.data[0];

          return {
            entity: {
              domain,
              renewer_address: renewerAddr,
              auto_renew_contract: contract,
            },
            update: [
              {
                $set: {
                  domain,
                  renewer_address: renewerAddr,
                  enabled: false,
                },
              },
            ],
          };
        }

        case SELECTOR_KEYS.ON_AUTO_RENEW: {
          const contract = event.fromAddress;
          const domain = decodeDomain([BigInt(event.keys[1])]);
          const renewerAddr = event.data[0];
          const timestamp = event.data[7];

          return {
            entity: {
              domain,
              renewer_address: renewerAddr,
              auto_renew_contract: contract,
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
