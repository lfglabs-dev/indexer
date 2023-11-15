import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  IDENTITY_CONTRACT,
  MONGO_CONNECTION_STRING,
  ID_UPGRADE_A_BLOCK,
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
    {
      fromAddress: formatFelt(IDENTITY_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_MAIN_ID_UPDATE)],
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

      switch (key) {
        case SELECTOR_KEYS.TRANSFER: {
          const { to, id } =
            Number(header.blockNumber) > ID_UPGRADE_A_BLOCK
              ? { to: event.keys[2], id: event.keys[3] }
              : { to: event.data[1], id: event.data[2] };

          return {
            entity: { id },
            update: [
              {
                $set: {
                  id: id,
                  owner: to,
                  main: {
                    $cond: {
                      if: { $ne: [to, "$owner"] },
                      then: false, // if the owner changed, it is no longer main
                      // if it is not set, set it to false
                      else: { $cond: [{ $not: ["$main"] }, false, "$main"] },
                    },
                  },
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

        case SELECTOR_KEYS.ON_MAIN_ID_UPDATE: {
          const owner = event.keys[1];
          const id = event.data[2];
          return {
            entity: { owner },
            update: [
              {
                $set: {
                  id,
                  // if owner is  zero, it meansc it resets
                  main:
                    owner !=
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                },
              },
            ],
          };
        }

        default:
          return;
      }
    })
    .filter(Boolean);

  return output;
}
