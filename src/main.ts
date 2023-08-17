import { decodeTransfersInBlock } from "./listener.ts";
import { MongoClient } from "./deps.ts";
import { MONGO_CONNECTION_STRING } from "./utils/constants.ts";
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

async function ensureIndexes() {
  const client = new MongoClient();
  await client.connect(MONGO_CONNECTION_STRING);
  const db = client.database(config.sinkOptions.database);
  const collection = db.collection(config.sinkOptions.collectionName);

  const indexData: { name: string; keys: Record<string, number> }[] =
    JSON.parse(Deno.readTextFileSync("indexes.json"));

  for (const index of indexData) {
    const existingIndexes = await collection.listIndexes().toArray();
    if (!existingIndexes.some((e) => e.name === index.name)) {
      await collection.createIndex(index.keys, { name: index.name });
    }
  }

  client.close();
}

await ensureIndexes();

export default function transform(batch) {
  return batch.flatMap(decodeTransfersInBlock);
}
