import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  MONGO_CONNECTION_STRING,
  NAMING_CONTRACT,
  AR_FINALITY,
} from "./common/constants.ts";
import { decodeDomain } from "./common/starknetid.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_UPDATE)],
    },
  ],
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  finality: AR_FINALITY,
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "renewals",
    entityMode: true,
  },
};

export default function transform({ header, events }: Block) {
  if (!header) {
    console.log("missing header, unable to process", events.length, "events");
    return;
  }
  const timestamp = Math.floor(new Date(header.timestamp).getTime() / 1000);
  const output = events
    .map(({ event }: EventWithTransaction) => {
      const key = BigInt(event.keys[0]);

      switch (key) {
        case SELECTOR_KEYS.OLD_DOMAIN_UPDATE: {
          const domainLength = Number(event.data[0]);
          if (domainLength !== 1) {
            // this should not happen
            return;
          }
          const domain = decodeDomain([BigInt(event.data[1])]);
          const expiry = Number(event.data[domainLength + 2]);
          console.log("detected a renewal of", domain);
          return {
            entity: { domain },
            update: [
              {
                $set: {
                  domain,
                  prev_expiry: {
                    $cond: [{ $not: ["$expiry"] }, 0, "$expiry"],
                  },
                  expiry: +expiry,
                  timestamp,
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
