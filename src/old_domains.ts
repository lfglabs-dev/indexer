import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  NAMING_CONTRACT,
} from "./common/constants.ts";
import { decodeDomain } from "./common/starknetid.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_UPDATE)],
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
    collectionName: "domains",
    entityMode: true,
  },
};

export default function transform({ events }: Block) {
  const output = events.map(({ event }: EventWithTransaction) => {
    const domainLength = Number(event.data[0]);
    console.log("hello:", domainLength);
    if (domainLength != 1) {
      return;
    }
    const domain = decodeDomain([BigInt(event.data[1])]);
    const expiry = event.data[domainLength];
    const owner = BigInt(event.data[domainLength + 1]).toString();

    return {
      entity: { domain },
      update: {
        $set: { domain, owner, expiry: +expiry },
      },
    };
  });
  return output;
}
