import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  MONGO_CONNECTION_STRING,
  STARKURABU_NFT_CONTRACT,
  FINALITY,
} from "./common/constants.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(STARKURABU_NFT_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.EQUIPMENT_UPDATED)],
      includeTransaction: false,
      includeReceipt: false,
    },
  ],
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("STARKURABU_STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  finality: FINALITY,
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "starkurabu_nfts_images",
    entityMode: true,
  },
};

export default function transform({ header, events }: Block) {
  if (!header) {
    console.log("missing header, unable to process", events.length, "events");
    return;
  }
  const _timestamp = Math.floor(new Date(header.timestamp).getTime() / 1000);
  const output = events
    .map(({ event }: EventWithTransaction) => {
      const key = BigInt(event.keys[0]);

      switch (key) {
        case SELECTOR_KEYS.EQUIPMENT_UPDATED: {
          const tokenId = event.keys[1];
          const _owner = event.keys[2];
          const _previousImageId = Number(event.data[0]);
          const newImageId = Number(event.data[1]);

          return {
            entity: { token_id: tokenId },
            update: [
              {
                $set: {
                  token_id: tokenId,
                  image_id: newImageId,
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
