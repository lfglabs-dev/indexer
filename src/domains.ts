import { Block, EventWithTransaction } from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  NAMING_CONTRACT,
  MONGO_CONNECTION_STRING,
  NAMING_UPGRADE_A_BLOCK,
  FINALITY,
} from "./common/constants.ts";
import { decodeDomain } from "./common/starknetid.ts";

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.DOMAIN_MINT)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.DOMAIN_RENEWAL)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.DOMAIN_TO_RESOLVER_UPDATE)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.DOMAIN_TRANSFER)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.DOMAIN_REV_ADDR_UPDATE)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.SUBDOMAINS_RESET)],
      includeTransaction: false,
      includeReceipt: false,
    },
    // Cairo Zero events:
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_UPDATE)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_TRANSFER)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_RESOLVER_UPDATE)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_ADDR_UPDATE)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_REV_ADDR_UPDATE)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_SUBDOMAINS_RESET)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.LEGACY_DOMAIN_TO_ADDR_CLEAR)],
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
    collectionName: "domains",
    entityMode: true,
  },
};

export default function transform({ header, events }: Block) {
  if (!header) {
    console.log("missing header, unable to process", events.length, "events");
    return;
  }
  const timestamp = Math.floor(new Date(header.timestamp).getTime() / 1000);

  if (Number(header.blockNumber) < NAMING_UPGRADE_A_BLOCK) {
    return tranformCairoZeroDomains(timestamp, events);
  }

  return tranformDomains(timestamp, events);
}

function tranformDomains(timestamp: number, events: EventWithTransaction[]) {
  const output = events.map(({ event }: EventWithTransaction) => {
    const key = BigInt(event.keys[0]);

    switch (key) {
      case SELECTOR_KEYS.DOMAIN_MINT: {
        const domain = decodeDomain([BigInt(event.keys[1])]);
        const owner = event.data[0];
        const expiry = Number(event.data[1]);
        return {
          entity: { domain },
          update: [
            {
              $set: {
                domain,
                id: owner,
                expiry: +expiry,
                root: true,
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
        };
      }

      case SELECTOR_KEYS.DOMAIN_RENEWAL: {
        const domain = decodeDomain([BigInt(event.keys[1])]);
        const new_expiry = Number(event.data[0]);
        return {
          entity: { domain },
          update: [
            {
              $set: {
                expiry: +new_expiry,
              },
            },
          ],
        };
      }

      case SELECTOR_KEYS.DOMAIN_TRANSFER: {
        const domainLength = Number(event.keys[0]);
        const domain = decodeDomain(
          event.keys.slice(1, 1 + domainLength).map(BigInt)
        );
        const prevOwner = event.data[0];
        const newOwner = event.data[1];

        // this can be used to create subdomains documents
        return {
          entity: { domain, id: prevOwner },
          update: [
            {
              $set: {
                domain,
                id: newOwner,
                root: { $cond: [{ $not: ["$root"] }, false, "$root"] },
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

      case SELECTOR_KEYS.DOMAIN_REV_ADDR_UPDATE: {
        const address = event.keys[1];
        const domainLength = Number(event.data[0]);
        const domain = decodeDomain(
          event.data.slice(1, 1 + domainLength).map(BigInt)
        );
        return [
          {
            entity: { rev_address: address },
            update: [
              {
                $unset: "rev_address",
              },
            ],
          },
          {
            entity: { domain },
            update: [
              {
                $set: {
                  rev_address: address,
                },
              },
            ],
          },
        ];
      }

      case SELECTOR_KEYS.LEGACY_DOMAIN_TO_ADDR_CLEAR: {
        const domainLength = Number(event.keys[1]);
        const domain = decodeDomain(
          event.keys.slice(2, 2 + domainLength).map(BigInt)
        );
        return {
          entity: { domain },
          update: [
            {
              $set: {
                legacy_address:
                  "0x0000000000000000000000000000000000000000000000000000000000000000",
              },
            },
          ],
        };
      }

      // todo: support reset

      default:
        return;
    }
  });

  return output.flat().filter(Boolean);
}

function tranformCairoZeroDomains(
  timestamp: number,
  events: EventWithTransaction[]
) {
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
          update: [
            {
              $set: {
                domain,
                id: owner,
                expiry: +expiry,
                root: true,
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
        };
      }

      case SELECTOR_KEYS.OLD_DOMAIN_TRANSFER: {
        const domainLength = Number(event.data[0]);
        const domain = decodeDomain(
          event.data.slice(1, 1 + domainLength).map(BigInt)
        );
        const prevOwner = event.data[domainLength + 1];
        const newOwner = event.data[domainLength + 2];

        // this can be used to create subdomains documents
        return {
          entity: { domain, id: prevOwner },
          update: [
            {
              $set: {
                domain,
                id: newOwner,
                root: { $cond: [{ $not: ["$root"] }, false, "$root"] },
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
        return [
          {
            entity: { rev_address: address },
            update: [
              {
                $unset: "rev_address",
              },
            ],
          },
          {
            entity: { domain },
            update: [
              {
                $set: {
                  rev_address: address,
                },
              },
            ],
          },
        ];
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
  return output.flat().filter(Boolean);
}
