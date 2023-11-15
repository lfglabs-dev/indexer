import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  MONGO_CONNECTION_STRING,
  CUSTOM_RESOLVERS_STRINGS,
  FINALITY,
} from "./common/constants.ts";
import { decodeDomainSlice } from "./common/starknetid.ts";

const filter = {
  header: { weak: true },
  events: CUSTOM_RESOLVERS_STRINGS.map((custom_resolver) => {
    return {
      fromAddress: formatFelt(custom_resolver),
      includeTransaction: false,
      includeReceipt: false,
        formatFelt(SELECTOR_KEYS.OLD_DOMAIN_ADDR_UPDATE),
        formatFelt(SELECTOR_KEYS.CUSTOM_RESOLVER_UPDATE),
      ],
    };
  }),
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
    collectionName: "custom_resolutions",
    entityMode: true,
  },
};

export default function transform({ header, events }: Block) {
  if (!header) {
    console.log("missing header, unable to process", events.length, "events");
    return;
  }
  const timestamp = Math.floor(new Date(header.timestamp).getTime() / 1000);

  return events.map(({ event }: EventWithTransaction) => {
    const key = BigInt(event.keys[0]);
    switch (key) {
      case SELECTOR_KEYS.OLD_DOMAIN_ADDR_UPDATE: {
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
              creation_date: {
                $cond: [
                  { $not: ["$creation_date"] },
                  timestamp,
                  "$creation_date",
                ],
              },
            },
          },
        };
      }
      case SELECTOR_KEYS.CUSTOM_RESOLVER_UPDATE: {
        const domainLength = Number(event.keys[1]);
        const domainSlice = decodeDomainSlice(
          event.keys.slice(2, 2 + domainLength).map(BigInt)
        );
        const field = event.keys[domainLength + 1];
        const value = event.data[0];
        const resolver = event.fromAddress;
        return {
          entity: { resolver, domain_slice: domainSlice, field },
          update: {
            $set: {
              resolver,
              domain_slice: domainSlice,
              field,
              value: value,
              creation_date: {
                $cond: [
                  { $not: ["$creation_date"] },
                  timestamp,
                  "$creation_date",
                ],
              },
            },
          },
        };
      }
    }
  });
}
