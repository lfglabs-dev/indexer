import { decodeTransfersInBlock } from "./listener.ts";
import { Block } from "./deps.ts";
import filter from "./filter.ts";

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  sinkOptions: {
    database: "sales",
    collectionName: "sales",
  },
};

export default function transform(block: Block) {
  return decodeTransfersInBlock(block);
}
