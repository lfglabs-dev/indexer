import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  IDENTITY_CONTRACT,
} from "./common/constants.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(IDENTITY_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.VERIFIER_DATA_UPDATE)],
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
    database: "starknetid",
    collectionName: "id_verifier_data",
    entityMode: true,
  },
};

export default function transform({ events }: Block) {
  const output = events.map(({ event }: EventWithTransaction) => {
    const id = BigInt(event.data[0]).toString();
    const field = event.data[1];
    const data = event.data[2];
    const verifier = event.data[3];
    return {
      entity: { id, field, verifier },
      update: {
        $set: {
          id,
          field,
          data,
          verifier,
        },
      },
    };
  });
  return output;
}
