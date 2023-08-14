import { decodeTransfersInBlock, filter } from "./listener.ts";

export const config = {
  streamUrl: "https://mainnet.starknet.a5a.ch",
  startingBlock: 12628,
  network: "starknet",
  filter,
  sinkType: "mongo",
  sinkOptions: {
    database: "sales",
    collectionName: "transfers",
  },
};

export default function transform(batch) {
  return batch.flatMap(decodeTransfersInBlock);
}
