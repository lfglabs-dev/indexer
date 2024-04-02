import {
  uint256,
  formatUnits,
  Block,
  EventWithTransaction,
} from "./common/deps.ts";
import {
  formatFelt,
  NAMING_CONTRACT,
  SELECTOR_KEYS,
  DECIMALS,
  MONGO_CONNECTION_STRING,
  FINALITY,
  NAMING_UPGRADE_A_BLOCK,
  TOKEN_CONTRACTS,
} from "./common/constants.ts";
import { decodeDomain } from "./common/starknetid.ts";

const events = [
  {
    fromAddress: Deno.env.get("NAMING_CONTRACT"),
    keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_UPDATE)],
    includeTransaction: true,
    includeReceipt: false,
  },
  {
    fromAddress: Deno.env.get("NAMING_CONTRACT"),
    keys: [formatFelt(SELECTOR_KEYS.DOMAIN_SALE_METADATA)],
    includeTransaction: false,
    includeReceipt: false,
  },
  {
    fromAddress: Deno.env.get("NAMING_CONTRACT"),
    keys: [formatFelt(SELECTOR_KEYS.DOMAIN_MINT)],
    includeTransaction: true,
    includeReceipt: false,
  },
];

for (const tokenContract of TOKEN_CONTRACTS) {
  events.push({
    fromAddress: tokenContract,
    keys: [formatFelt(SELECTOR_KEYS.TRANSFER)],
    includeTransaction: false,
    includeReceipt: false,
  });
}

const filter = {
  header: { weak: true },
  events,
};

export const config = {
  streamUrl: Deno.env.get("STREAM_URL"),
  startingBlock: Number(Deno.env.get("NAMING_STARTING_BLOCK")),
  network: "starknet",
  filter,
  sinkType: "mongo",
  finality: FINALITY,
  sinkOptions: {
    connectionString: MONGO_CONNECTION_STRING,
    database: "starknetid",
    collectionName: "sales",
    entityMode: false,
  },
};

type SaleDocument = {
  tx_hash: string;
  meta_hash: string;
  domain: string;
  token: string;
  price: number;
  payer: string;
  timestamp: number;
  expiry: number;
};

interface TransferDetails {
  token: string;
  from_address: string;
  amount: string;
}

export default function transform({ header, events }: Block) {
  if (!header) {
    console.log("missing header, unable to process", events.length, "events");
    return;
  }
  const timestamp = Math.floor(new Date(header.timestamp).getTime() / 1000);

  if (Number(header.blockNumber) < NAMING_UPGRADE_A_BLOCK) {
    return tranformCairoZero(timestamp, events);
  }

  return tranform(timestamp, events);
}

function tranform(timestamp: number, events: EventWithTransaction[]) {
  let lastTransfer: TransferDetails | null = null;
  let metadata = "0x0";

  // Mapping and decoding each event in the block
  const decodedEvents = events.map(
    ({ event, transaction }: EventWithTransaction) => {
      const key = BigInt(event.keys[0]);

      switch (key) {
        case SELECTOR_KEYS.TRANSFER: {
          const tokenAddr = event.fromAddress;
          const [fromAddress, toAddress, amountLow, amountHigh] = event.data;
          if (BigInt(toAddress) !== NAMING_CONTRACT) return;

          lastTransfer = {
            token: tokenAddr,
            from_address: fromAddress,
            amount: formatUnits(
              uint256.uint256ToBN({ low: amountLow, high: amountHigh }),
              DECIMALS
            ),
          };
          break;
        }

        case SELECTOR_KEYS.DOMAIN_SALE_METADATA:
          //domain = Number(event.data[0]);
          metadata = event.data[1];
          break;

        case SELECTOR_KEYS.DOMAIN_MINT: {
          if (!lastTransfer) return;
          const expiry = Number(event.data[1]);

          // Basic output object structure
          const output: SaleDocument = {
            tx_hash: transaction.meta.hash,
            meta_hash: metadata.slice(4),
            domain: decodeDomain([BigInt(event.keys[1])]),
            token: lastTransfer.token,
            price: +lastTransfer.amount,
            payer: lastTransfer.from_address,
            timestamp,
            expiry,
          };

          lastTransfer = null;
          return output;
        }

        default:
          return;
      }
    }
  );

  // Filtering out undefined or null values from the decoded events array
  return decodedEvents.filter(Boolean) as SaleDocument[];
}

function tranformCairoZero(timestamp: number, events: EventWithTransaction[]) {
  let lastTransfer: TransferDetails | null = null;
  let metadata = "0x0";

  // Mapping and decoding each event in the block
  const decodedEvents = events.map(
    ({ event, transaction }: EventWithTransaction) => {
      const key = BigInt(event.keys[0]);

      switch (key) {
        case SELECTOR_KEYS.TRANSFER: {
          const [fromAddress, toAddress, amountLow, amountHigh] = event.data;
          if (BigInt(toAddress) !== NAMING_CONTRACT) return;

          lastTransfer = {
            token: Deno.env.get("ETH_CONTRACT") as string,
            from_address: fromAddress,
            amount: formatUnits(
              uint256.uint256ToBN({ low: amountLow, high: amountHigh }),
              DECIMALS
            ),
          };
          break;
        }

        case SELECTOR_KEYS.DOMAIN_SALE_METADATA:
          //domain = Number(event.data[0]);
          metadata = event.data[1];
          break;

        case SELECTOR_KEYS.OLD_DOMAIN_UPDATE: {
          if (!lastTransfer) return;

          const arrLen = Number(event.data[0]);
          const expiry = Number(event.data[arrLen + 2]);

          // Basic output object structure
          const output: SaleDocument = {
            tx_hash: transaction.meta.hash,
            meta_hash: metadata.slice(4),
            domain: decodeDomain(event.data.slice(1, 1 + arrLen).map(BigInt)),
            token: lastTransfer.token,
            price: +lastTransfer.amount,
            payer: lastTransfer.from_address,
            timestamp: timestamp,
            expiry,
          };

          lastTransfer = null;
          return output;
        }

        default:
          return;
      }
    }
  );

  // Filtering out undefined or null values from the decoded events array
  return decodedEvents.filter(Boolean) as SaleDocument[];
}
