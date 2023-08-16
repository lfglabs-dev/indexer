import { uint256 } from "./deps.ts";
import { decodeDomain } from "./utils/starknetid.ts";
import { NAMING_CONTRACT } from "./utils/constants.ts";
import { SELECTOR_KEYS } from "./utils/constants.ts";

interface EventInfo {
  fromAddress: string;
  keys: string[];
}

interface TransferDetails {
  from_address: string;
  amount: string;
}

export function decodeTransfersInBlock({ header, events }): any[] {
  const { blockNumber, blockHash, timestamp } = header;
  let lastTransfer: TransferDetails | null = null;
  let autoRenewed = false;
  let sponsorComm: number | null = null;
  let sponsorAddr: number | null = null;

  const decodedEvents = events.map(({ event, receipt }) => {
    const key = BigInt(event.keys[0]);

    switch (key) {
      case SELECTOR_KEYS.TRANSFER:
        const [fromAddress, toAddress, amountLow, amountHigh] = event.data;
        if (BigInt(toAddress) !== NAMING_CONTRACT) return;
        lastTransfer = {
          from_address: fromAddress,
          amount: uint256
            .uint256ToBN({ low: amountLow, high: amountHigh })
            .toString(),
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
        const output = {
          domain: decodeDomain(event.data.slice(1, 1 + arrLen).map(BigInt)),
          timestamp: new Date(timestamp).getTime(),
          price: lastTransfer.amount,
          payer: lastTransfer.from_address,
          expiry,
          auto: autoRenewed,
          sponsor: sponsorAddr,
          sponsor_comm: sponsorComm,
        };

        lastTransfer = null;
        autoRenewed = false;
        sponsorComm = null;
        sponsorAddr = null;
        return output;

      default:
        return;
    }
  });

  return decodedEvents.filter(Boolean);
}
