import {
  Block,
  BlockHeader,
  EventWithTransaction,
  uint256,
  formatUnits,
} from "./common/deps.ts";
import {
  formatFelt,
  SELECTOR_KEYS,
  NAMING_CONTRACT,
  MONGO_CONNECTION_STRING,
  FINALITY,
  DECIMALS,
  ETH_CONTRACT,
} from "./common/constants.ts";
import { decodeDomain } from "./common/starknetid.ts";

type SaleDocument = {
  domain: string;
  timestamp: number;
  price: number;
  payer: string;
  expiry: number;
  auto: boolean;
  sponsor: number;
  sponsor_comm: number;
};

interface TransferDetails {
  from_address: string;
  amount: string;
}

const filter = {
  header: { weak: true },
  events: [
    {
      fromAddress: formatFelt(ETH_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.TRANSFER)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.OLD_DOMAIN_UPDATE)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_COMMISSION)],
      includeTransaction: false,
      includeReceipt: false,
    },
    {
      fromAddress: formatFelt(NAMING_CONTRACT),
      keys: [formatFelt(SELECTOR_KEYS.ON_AUTO_RENEW)],
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
    collectionName: "sales",
    entityMode: false,
  },
};

export default function transform({ header, events }: Block) {
  const { timestamp } = header as BlockHeader;

  let lastTransfer: TransferDetails | null = null;
  let autoRenewed = false;
  let sponsorComm: number | null = null;
  let sponsorAddr: number | null = null;

  // Mapping and decoding each event in the block
  const decodedEvents = events.map(({ event }: EventWithTransaction) => {
    const key = BigInt(event.keys[0]);

    switch (key) {
      case SELECTOR_KEYS.TRANSFER: {
        const [fromAddress, toAddress, amountLow, amountHigh] = event.data;
        if (BigInt(toAddress) !== NAMING_CONTRACT) return;

        lastTransfer = {
          from_address: fromAddress,
          amount: formatUnits(
            uint256.uint256ToBN({ low: amountLow, high: amountHigh }),
            DECIMALS
          ),
        };
        break;
      }

      case SELECTOR_KEYS.ON_AUTO_RENEW: {
        const allowanceLow = Number(event.data[1]);
        if (allowanceLow != 0) {
          autoRenewed = true;
        }
        break;
      }

      case SELECTOR_KEYS.ON_COMMISSION:
        sponsorComm = Number(event.data[1]);
        sponsorAddr = Number(event.data[3]);
        autoRenewed = true;
        break;

      case SELECTOR_KEYS.OLD_DOMAIN_UPDATE: {
        if (!lastTransfer) return;

        const arrLen = Number(event.data[0]);
        const expiry = Number(event.data[arrLen + 2]);

        // Basic output object structure
        const output = {
          domain: decodeDomain(event.data.slice(1, 1 + arrLen).map(BigInt)),
          timestamp: new Date(timestamp).getTime() / 1000,
          price: +lastTransfer.amount,
          payer: lastTransfer.from_address,
          expiry,
          auto: autoRenewed,
          sponsor: 0,
          sponsor_comm: 0,
        };

        // Conditionally add sponsor and sponsor_comm if they are not null
        if (sponsorAddr !== null) {
          output.sponsor = sponsorAddr;
          output.sponsor_comm = +(sponsorComm as number);
        }

        lastTransfer = null;
        autoRenewed = false;
        sponsorComm = null;
        sponsorAddr = null;
        return output;
      }

      default:
        return;
    }
  });

  // Filtering out undefined or null values from the decoded events array
  return decodedEvents.filter(Boolean) as SaleDocument[];
}
