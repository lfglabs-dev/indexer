import { Block, EventWithTransaction, ec, uint256 } from "./common/deps.ts";

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
      keys: [formatFelt(SELECTOR_KEYS.TRANSFER)],
      includeTransaction: false,
      includeReceipt: false,
    },
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
    collectionName: "starkurabu_nfts",
    entityMode: true,
  },
};

const randint = (entropyObj: { value: bigint }, upperLimit: bigint): bigint => {
  let q = entropyObj.value / upperLimit;
  let r = entropyObj.value % upperLimit;
  entropyObj.value = q;
  return r;
};

// generate a random trait id, where the default trait (id = 0) is COEFF times more likely
const randomTrait = (
  entropyObj: { value: bigint },
  coeff: bigint,
  normalVariantAmount: bigint
): bigint => {
  let random = randint(entropyObj, normalVariantAmount + coeff);
  if (random >= normalVariantAmount) {
    return 0n;
  } else {
    return random;
  }
};

function assetsToImageId(imageAssets: bigint[]): bigint {
  let acc: bigint = 0n;
  let multiplier: bigint = 1n;

  imageAssets.forEach((value) => {
    acc += value * multiplier;
    multiplier *= 1024n;
  });

  return acc;
}

// compute imageId from tokenId
function tokenIdToImageId(tokenId: bigint): string {
  const hash = ec.starkCurve.pedersen(tokenId, 0);
  const entropy = uint256.bnToUint256(hash).low;
  const entropyObj = { value: BigInt(entropy) };

  const eyesShapes = randint(entropyObj, BigInt(5));
  const hairShape = randomTrait(entropyObj, BigInt(12), BigInt(4));
  const hat =
    hairShape !== BigInt(0)
      ? BigInt(0)
      : randomTrait(entropyObj, BigInt(4), BigInt(32));

  const background = randomTrait(entropyObj, 10n, 8n);
  const effect = randomTrait(entropyObj, 10n, 4n);
  const furrColor = randint(entropyObj, 10n);
  const irisColor = randint(entropyObj, 3n);
  const handShape = randint(entropyObj, 30n);
  const mouthShape = randint(entropyObj, 9n);
  const glasses = randint(entropyObj, 7n);
  const tops = randint(entropyObj, 37n);

  const imageAssets: bigint[] = [
    background,
    effect,
    furrColor,
    irisColor,
    handShape,
    mouthShape,
    eyesShapes,
    eyesShapes,
    hairShape,
    glasses,
    hat,
    tops,
  ];

  return assetsToImageId(imageAssets).toString();
}

export default function transform({ header, events }: Block) {
  if (!header) {
    console.log("missing header, unable to process", events.length, "events");
    return;
  }
  const timestamp = Math.floor(new Date(header.timestamp).getTime() / 1000);
  const output = events
    .map(({ event }: EventWithTransaction) => {
      const key = BigInt(event.keys[0]);

      switch (key) {
        case SELECTOR_KEYS.TRANSFER: {
          const { to, token_id } = {
            to: event.keys[2],
            token_id: event.keys[3],
          };

          return [
            {
              entity: { token_id },
              update: [
                {
                  $set: {
                    token_id,
                    image_id: tokenIdToImageId(BigInt(token_id)),
                    owner: to,
                    creation_date: {
                      $cond: [
                        { $not: ["$creation_date"] },
                        timestamp,
                        "$creation_date",
                      ],
                    },
                  },
                },
              ],
            },
          ];
        }

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
    .flat()
    .filter(Boolean);

  console.log("output:", output);
  return output;
}
