import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  NAMING_CONTRACT,
  MONGO_CONNECTION_STRING,
} from "./common/constants.ts";
import { decodeDomain } from "./common/starknetid.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_UPDATE)],
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_TRANSFER)],
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_RESOLVER_UPDATE)],
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_ADDR_UPDATE)],
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_REV_ADDR_UPDATE)],
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_SUBDOMAINS_RESET)],
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
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "domains",
    entityMode: true,
  },
};

export default function transform({ events }: Block) {
  const output = events.map(({ event }: EventWithTransaction) => {
    const key = BigInt(event.keys[0]);

    switch (key) {
      // only used by root domains
      case SELECTOR_KEYS.OLD_DOMAIN_UPDATE: {
        const domainLength = Number(event.data[0]);
        if (domainLength !== 1) {
          // this should not happen
          return;
        }
        const domain = decodeDomain([BigInt(event.data[1])]);
        const owner = event.data[domainLength + 1];
        const expiry = Number(event.data[domainLength + 2]);
        return {
          entity: { domain },
          update: {
            $set: {
              domain,
              id: owner,
              expiry: +expiry,
              root: true,
            },
          },
        };
      }

      case SELECTOR_KEYS.OLD_DOMAIN_TRANSFER: {
        const domainLength = Number(event.data[0]);
        const domain = decodeDomain(
          event.data.slice(1, 1 + domainLength).map(BigInt)
        );
        const prevOwner = event.data[domainLength + 1];
        const newOwner = event.data[domainLength + 2];

        console.log(domain, "new_owner:", newOwner);

        // this can be used to create subdomains documents
        return {
          entity: { domain, id: prevOwner },
          update: [
            {
              $set: {
                domain,
                id: newOwner,
                root: { $cond: [{ $not: ["$root"] }, false, "$root"] },
              },
            },
          ],
        };
      }

      case SELECTOR_KEYS.OLD_DOMAIN_RESOLVER_UPDATE: {
        const domainLength = Number(event.data[0]);
        const domain = decodeDomain(
          event.data.slice(1, 1 + domainLength).map(BigInt)
        );
        const resolver = event.data[domainLength + 1];
        return {
          entity: { domain },
          update: [
            {
              $set: {
                resolver,
              },
            },
          ],
        };
      }

      case SELECTOR_KEYS.OLD_DOMAIN_ADDR_UPDATE: {
        const domainLength = Number(event.data[0]);
        const domain = decodeDomain(
          event.data.slice(1, 1 + domainLength).map(BigInt)
        );
        const address = event.data[domainLength + 1];
        return {
          entity: { domain },
          update: [
            {
              $set: {
                legacy_address: address,
              },
            },
          ],
        };
      }

      case SELECTOR_KEYS.OLD_DOMAIN_REV_ADDR_UPDATE: {
        const address = event.data[0];
        const domainLength = Number(event.data[1]);
        const domain = decodeDomain(
          event.data.slice(2, 2 + domainLength).map(BigInt)
        );
        return {
          entity: { domain },
          update: [
            {
              $set: {
                rev_address: address,
              },
            },
          ],
        };
      }

      // case SELECTOR_KEYS.OLD_SUBDOMAINS_RESET: {
      //   const domainLength = Number(event.data[0]);
      //   const domain = decodeDomain(
      //     event.data.slice(1, 1 + domainLength).map(BigInt)
      //   );
      //   const regexPattern = new RegExp(`\.${domain.replace(".", "\\.")}$`);

      //   return {
      //     entity: { domain },
      //     update: [
      //       {
      //         $pull: {
      //           domains: {
      //             domain: { $regex: regexPattern },
      //           },
      //         },
      //       },
      //     ],
      //   };
      // }

      default:
        return;
    }
  });
  return output;
}
