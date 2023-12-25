import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  BOOST_CONTRACT,
  STARKNET_QUEST_MONGODB_CONNECTION_STRING,
  FINALITY,
  QUEST_DATABASE,
} from "./common/constants.ts";
import { hash, BN } from "./common/deps.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(BOOST_CONTRACT),
      keys: [hash.getSelectorFromName("OnClaim")],
    },
  ],
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("BOOST_STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  finality: FINALITY,
  sinkOptions: {
    connectionString: STARKNET_QUEST_MONGODB_CONNECTION_STRING,
    database: QUEST_DATABASE,
    collectionName: "boost_claims",
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
      const address = event.keys[1];
      if (!event.keys[2]) {
        return;
      }
      const boost_id = parseInt(
        new BN(event.keys[2].slice(2), 16).toString(10)
      );

      return {
        entity: { winner: address, id: boost_id },
        update: [
          {
            $set: {},
          },
        ],
      };
    })
    .filter(Boolean);

  return output;
}
