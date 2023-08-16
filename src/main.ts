import { decodeTransfersInBlock } from "./listener.ts";
import filter from "./filter.ts";

Deno.env.get("MONGO_CONNECTION_STRING");

export const config = {
  streamUrl: "https://mainnet.starknet.a5a.ch",
  startingBlock: 12628,
  network: "starknet",
  filter,
  sinkType: "mongo",
  sinkOptions: {
    database: "sales",
    collectionName: "sales",
  },
};

export default function transform(batch) {
  return batch.flatMap(decodeTransfersInBlock);
}
