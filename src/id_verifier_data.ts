import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  IDENTITY_CONTRACT,
  MONGO_CONNECTION_STRING,
  ID_UPGRADE_A_BLOCK,
  FINALITY,
} from "./common/constants.ts";
import { Event } from "https://esm.sh/v131/@apibara/indexer@0.1.2/dist/starknet/block.js";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(IDENTITY_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.VERIFIER_DATA_UPDATE)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(IDENTITY_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.EXTENDED_VERIFIER_DATA_UPDATE)],
      includeTransaction: false,
      includeReceipt: false,
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
    collectionName: "id_verifier_data",
    entityMode: true,
  },
};

export default function transform({ header, events }: Block) {
  if (!header) {
    console.log("missing header, unable to process", events.length, "events");
    return;
  }
  const output = events.map(({ event }: EventWithTransaction) => {
    if (Number(header.blockNumber) > ID_UPGRADE_A_BLOCK) {
      return handling(event);
    } else {
      return oldHandling(event);
    }
  });
  return output;
}

function handling(event: Event) {
  const key = BigInt(event.keys[0]);
  switch (key) {
    case SELECTOR_KEYS.VERIFIER_DATA_UPDATE: {
      const id = event.keys[1];
      const field = event.data[0];
      const data = event.data[1];
      const verifier = event.data[2];
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
    }

    case SELECTOR_KEYS.EXTENDED_VERIFIER_DATA_UPDATE: {
      const id = event.keys[1];

      const verifier = event.data[0];
      const field = event.data[1];

      const dataLength = Number(event.data[2]);
      const data = event.data.slice(3, 3 + dataLength);
      return {
        entity: { id, field, verifier },
        update: {
          $set: {
            id,
            field,
            extended_data: data,
            verifier,
          },
        },
      };
    }
  }
}

function oldHandling(event: Event) {
  const key = BigInt(event.keys[0]);
  switch (key) {
    case SELECTOR_KEYS.VERIFIER_DATA_UPDATE: {
      const id = event.data[0];
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
    }

    case SELECTOR_KEYS.EXTENDED_VERIFIER_DATA_UPDATE: {
      const id = event.data[0];

      const verifier = event.data[1];
      const field = event.data[2];

      const dataLength = Number(event.data[3]);
      const data = event.data.slice(4, 4 + dataLength);

      return {
        entity: { id, field, verifier },
        update: {
          $set: {
            id,
            field,
            extended_data: data,
            verifier,
          },
        },
      };
    }
  }
}
