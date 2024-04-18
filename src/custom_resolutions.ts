import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  MONGO_CONNECTION_STRING,
  CUSTOM_RESOLVERS_STRINGS,
  FINALITY,
} from "./common/constants.ts";
import { decodeDomainSlice } from "./common/starknetid.ts";

const filter: {
  header: { weak: boolean };
  events: {
    keys: string[];
    fromAddress: string;
    includeTransaction: boolean;
    includeReceipt: boolean;
  }[];
} = {
  header: { weak: true },
  events: [],
};

const keys = [
  formatFelt(SELECTOR_KEYS.OLD_DOMAIN_ADDR_UPDATE),
  formatFelt(SELECTOR_KEYS.CUSTOM_RESOLVER_ADDRESS_UPDATE),
  formatFelt(SELECTOR_KEYS.CUSTOM_RESOLVER_UPDATE),
];

// Cartesian product of resolvers and keys
CUSTOM_RESOLVERS_STRINGS.map((custom_resolver) => ({
  fromAddress: formatFelt(custom_resolver),
  includeTransaction: false,
  includeReceipt: false,
})).forEach((event) => {
  keys.forEach((key) => {
    filter.events.push({
      ...event,
      keys: [key],
    });
  });
});

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("CUSTOM_RESOLVERS_STARTING_BLOCK")),
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
    // Cairo0 support
    if (key === SELECTOR_KEYS.OLD_DOMAIN_ADDR_UPDATE) {
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
            field:
              "0x000000000000000000000000000000000000000000000000737461726b6e6574", // starknet encoded
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
    } else if (key === SELECTOR_KEYS.CUSTOM_RESOLVER_ADDRESS_UPDATE) {
      // Cairo1 support
      const domainLength = Number(event.keys[1]);
      const domainSlice = decodeDomainSlice(
        event.keys.slice(2, 2 + domainLength).map(BigInt)
      );
      const targetAddress = event.data[0];
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
            field:
              "0x000000000000000000000000000000000000000000000000737461726b6e6574", // starknet encoded
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
    } else if (key === SELECTOR_KEYS.CUSTOM_RESOLVER_UPDATE) {
      const domainLength = Number(event.keys[1]);
      const domainSlice = decodeDomainSlice(
        event.keys.slice(2, 2 + domainLength).map(BigInt)
      );
      const field =
        event.keys.length > domainLength + 2
          ? event.keys[domainLength + 2]
          : "";
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
  });
}
