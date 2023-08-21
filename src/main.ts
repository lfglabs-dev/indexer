import { decodeTransfersInBlock } from "./listener.ts";
import { Config, Starknet, Block, Console } from "./deps.ts";
import filter from "./filter.ts";

export const config: Config<Starknet, Console> = {
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

export default function transform(batch: Block[]) {
  return batch.flatMap(decodeTransfersInBlock);
}
