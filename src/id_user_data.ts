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
  sinkOptions: {
    database: "starknetid",
    collectionName: "id_user_data",
    entityMode: true,
  },
};

export default function transform({ events }: Block) {
  // const { timestamp } = header as BlockHeader;
  // const output = events.map(({ event }: EventWithTransaction) => {
  //   const key = BigInt(event.keys[0]);
  //   const to = event.data[1];
  //   const id = BigInt(event.data[2]).toString();
  //   return {
  //     entity: { id },
  //     update: {
  //       $set: {
  //         id: id,
  //         owner: to,
  //         main: { $cond: [{ $not: ["$main"] }, false, "$main"] },
  //       },
  //     },
  //   };
  // });
}
