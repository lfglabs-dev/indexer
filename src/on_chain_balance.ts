import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  MONGO_CONNECTION_STRING,
  STARKURABU_NFT_CONTRACT,
  STARKURABU_ASSETS_CONTRACT,
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
    {
      fromAddress: formatFelt(STARKURABU_ASSETS_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ASSET_MINTED)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(STARKURABU_ASSETS_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ASSET_BURNT)],
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
    collectionName: "on_chain_balance",
    entityMode: true,
  },
};

function imageIdToAssets(imageId: bigint): number[] {
  const assets: number[] = new Array(12).fill(0);

  for (let i = 11; i >= 0; i--) {
    const divisor: bigint = BigInt(1024) ** BigInt(i);
    assets[i] = Number(imageId / divisor);
    imageId %= divisor;
  }

  return assets;
}

function compareAssets(
  previousAssets: number[],
  newAssets: number[]
): Array<[number, number, number]> {
  const changes: Array<[number, number, number]> = [];

  for (let i = 0; i < previousAssets.length; i++) {
    if (previousAssets[i] !== newAssets[i]) {
      changes.push([i, newAssets[i], 1]);
      changes.push([i, previousAssets[i], -1]);
    }
  }

  return changes;
}

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
          const _tokenId = event.keys[1];
          const owner = event.keys[2];
          const previousAssets = imageIdToAssets(BigInt(event.data[0]));
          const newAssets = imageIdToAssets(BigInt(event.data[1]));

          const output = [];
          for (const assetChange of compareAssets(previousAssets, newAssets)) {
            const [asset_id, variant_id, change] = assetChange;
            output.push({
              entity: { asset_id, variant_id, owner },
              update: [
                {
                  $incr: {
                    amount: change,
                  },
                },
              ],
            });
          }

          return output;
        }

        case SELECTOR_KEYS.ASSET_MINTED: {
          const owner = event.keys[1];
          const assetId = BigInt(event.data[0]);
          const variantId = BigInt(event.data[1]);
          const amount = BigInt(event.data[2]);

          return {
            entity: {
              asset_id: Number(assetId),
              variant_id: Number(variantId),
              owner,
            },
            update: [
              {
                $incr: {
                  amount: Number(amount),
                },
              },
            ],
          };
        }

        case SELECTOR_KEYS.ASSET_BURNT: {
          const owner = event.keys[1];
          const assetId = BigInt(event.data[0]);
          const variantId = BigInt(event.data[1]);
          const amount = BigInt(event.data[2]);

          return {
            entity: {
              asset_id: Number(assetId),
              variant_id: Number(variantId),
              owner,
            },
            update: [
              {
                $incr: {
                  amount: -Number(amount),
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
    .flat()
    .filter(Boolean);

  return output;
}
