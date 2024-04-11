import { Block, EventWithTransaction, shortString } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  MONGO_CONNECTION_STRING,
  FINALITY,
} from "./common/constants.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      keys: [formatFelt(SELECTOR_KEYS.OFFCHAIN_RESOLVER_UPDATE)],
      includeTransaction: false,
      includeReceipt: false,
    },
  ],
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("OFFCHAIN_RESOLVERS_STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  finality: FINALITY,
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "offchain_resolvers",
    entityMode: true,
  },
};

export default function transform({ header, events }: Block) {
  if (!header) {
    console.log("missing header, unable to process", events.length, "events");
    return;
  }
  const timestamp = Math.floor(new Date(header.timestamp).getTime() / 1000);

  return events.map(({ event }: EventWithTransaction) => {
    const key = BigInt(event.keys[0]);
    switch (key) {
      case SELECTOR_KEYS.OFFCHAIN_RESOLVER_UPDATE: {
        try {
          const contractAddress = event.keys[1];
          let uri = event.data
            .slice(1)
            .map((slice) => shortString.decodeShortString(slice))
            .join("");

          return {
            entity: { resolver_contract: contractAddress },
            update: [
              {
                $set: {
                  uri: uri,
                },
              },
            ],
          };
        } catch (e) {
          console.log(
            "Error while processing OFFCHAIN_RESOLVER_UPDATE event",
            e
          );
        }
      }
      // should not happen
      default:
        return;
    }
  });
}
