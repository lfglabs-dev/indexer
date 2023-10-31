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
      keys: [formatFelt(SELECTOR_KEYS.USER_DATA_UPDATE)],
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
    collectionName: "id_user_data",
    entityMode: true,
  },
};

export default function transform({ events }: Block) {
  const output = events.map(({ event }: EventWithTransaction) => {
    const id = event.data[0];
    const field = event.data[1];
    const data = event.data[2];
    return {
      entity: { id, field },
      update: {
        $set: {
          id,
          field,
          data,
        },
      },
    };
  });
  return output;
}
