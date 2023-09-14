import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  MONGO_CONNECTION_STRING,
  CUSTOM_RESOLVERS_STRINGS,
} from "./common/constants.ts";
import { decodeDomainSlice } from "./common/starknetid.ts";

const filter = {
  header: { weak: true },
  events: CUSTOM_RESOLVERS_STRINGS.map((custom_resolver) => {
    return {
      fromAddress: formatFelt(custom_resolver),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_ADDR_UPDATE)],
    };
  }),
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "custom_resolutions",
    entityMode: true,
  },
};

export default function transform({ events }: Block) {
  return events.map(({ event }: EventWithTransaction) => {
    const domainLength = Number(event.data[0]);
    const domainSlice = decodeDomainSlice(
      event.data.slice(1, 1 + domainLength).map(BigInt)
    );
    const targetAddress = event.data[domainLength + 1];
    const resolver = event.fromAddress;
    // 'field' will be used in the future to handle resolvings of more data
    // like your avatar or other blockchain addresses. Existing custom resolvers
    // only return a starknet address (equivalent to the starknet field written
    // on your identity on the new architecture).
    return {
      entity: { resolver, domain_slice: domainSlice, field: "starknet" },
      update: {
        $set: {
          resolver,
          domain_slice: domainSlice,
          field: "starknet",
          value: targetAddress,
        },
      },
    };
  });
}
