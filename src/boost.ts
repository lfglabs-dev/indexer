import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  BOOST_CONTRACT,
  MONGO_CONNECTION_STRING,
  ID_UPGRADE_A_BLOCK,
  FINALITY,
  AR_FINALITY,
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
  startingBlock: Number(Deno.env.get("STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  finality: AR_FINALITY,
  sinkOptions: {},
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "goerli",
    collectionName: "boosts",
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
      const address = new BN(event.keys[1].slice(2), 16).toString(10);
      if (!event.keys[2]) {
        return;
      }
      const boost_id = parseInt(
        new BN(event.keys[2].slice(2), 16).toString(10)
      );
      if (key === SELECTOR_KEYS.ON_CLAIM) {
        return {
          entity: { winner: address, id: boost_id },
          update: [
            {
              $set: {
                claimed: true,
              },
            },
          ],
        };
      } else {
        return;
      }
    })
    .filter(Boolean);

  return output;
}
