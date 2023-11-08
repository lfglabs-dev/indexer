import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  IDENTITY_CONTRACT,
  MONGO_CONNECTION_STRING,
  FINALITY,
} from "./common/constants.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(IDENTITY_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.TRANSFER)],
      includeTransaction: false,
      includeReceipt: false,
    },
  ],
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  finality: FINALITY,
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "id_owners",
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
      const to = event.data[1];
      const id = event.data[2];

      switch (key) {
        case SELECTOR_KEYS.TRANSFER: {
          return {
            entity: { id },
            update: [
              {
                $set: {
                  id: id,
                  owner: to,
                  main: { $cond: [{ $not: ["$main"] }, false, "$main"] },
                  creation_date: {
                    $cond: [
                      { $not: ["$creation_date"] },
                      timestamp,
                      "$creation_date",
                    ],
                  },
                },
              },
            ],
          };
        }

        // todo: udate main to true via new identity event

        default:
          return;
      }
    })
    .filter(Boolean);

  return output;
}
