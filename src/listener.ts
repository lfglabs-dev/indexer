import { uint256, formatUnits } from "./deps.ts";
import { decodeDomain } from "./utils/starknetid.ts";
import { NAMING_CONTRACT, SELECTOR_KEYS } from "./utils/constants.ts";
import { DECIMALS } from "./utils/constants.ts";

interface EventInfo {
  fromAddress: string;
  keys: string[];
}

interface TransferDetails {
  from_address: string;
  amount: string;
}

/**
 * Decodes and processes transfer events within a block.
 *
 * @param header Block header information
 * @param events List of events in the block
 * @returns Array of documents to include in the db
 */
export function decodeTransfersInBlock({ header, events }): any[] {
  const { blockNumber, blockHash, timestamp } = header;

  let lastTransfer: TransferDetails | null = null;
  let autoRenewed = false;
  let sponsorComm: number | null = null;
  let sponsorAddr: number | null = null;

  // Mapping and decoding each event in the block
  const decodedEvents = events.map(({ event, receipt }) => {
    const key = BigInt(event.keys[0]);

    switch (key) {
      case SELECTOR_KEYS.TRANSFER:
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

      case SELECTOR_KEYS.AUTO_RENEW:
        autoRenewed = true;
        break;

      case SELECTOR_KEYS.REFERRAL:
        sponsorComm = Number(event.data[1]);
        sponsorAddr = Number(event.data[3]);
        autoRenewed = true;
        break;

      case SELECTOR_KEYS.STARK_UPDATE:
        if (!lastTransfer) return;

        const arrLen = Number(event.data[0]);
        const expiry = Number(event.data[arrLen + 2]);

        // Basic output object structure
        const output: any = {
          domain: decodeDomain(event.data.slice(1, 1 + arrLen).map(BigInt)),
          timestamp: new Date(timestamp).getTime() / 1000,
          price: lastTransfer.amount,
          payer: lastTransfer.from_address,
          expiry,
          auto: autoRenewed,
        };

        // Conditionally add sponsor and sponsor_comm if they are not null
        if (sponsorAddr !== null) {
          output.sponsor = sponsorAddr;
          output.sponsor_comm = sponsorComm;
        }

        lastTransfer = null;
        autoRenewed = false;
        sponsorComm = null;
        sponsorAddr = null;
        return output;

      default:
        return;
    }
  });

  // Filtering out undefined or null values from the decoded events array
  return decodedEvents.filter(Boolean);
}
