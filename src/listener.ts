import { hash, uint256, formatUnits } from "./deps.ts";
import { decodeDomain } from "./utils/starknetid.ts";

const DECIMALS = 18;
const TRANSFER_KEY = BigInt(hash.getSelectorFromName("Transfer"));
const STARK_UPDATE_KEY = BigInt(hash.getSelectorFromName("starknet_id_update"));
const NAMING_CONTRACT = BigInt(
  "0x06ac597f8116f886fa1c97a23fa4e08299975ecaf6b598873ca6792b9bbfb678"
);

export const filter = {
  header: {
    weak: true,
  },
  events: [
    {
      fromAddress:
        "0x049D36570D4e46f48e99674bd3fcc84644DdD6b96F7C741B1562B82f9e004dC7",
      keys: ["0x" + TRANSFER_KEY.toString(16)],
    },
    {
      fromAddress:
        "0x6ac597f8116f886fa1c97a23fa4e08299975ecaf6b598873ca6792b9bbfb678",
      keys: ["0x" + STARK_UPDATE_KEY.toString(16)],
    },
  ],
};

export function decodeTransfersInBlock({ header, events }) {
  const { blockNumber, blockHash, timestamp } = header;
  let lastTransfer = null;

  const decodedEvents = events.map(({ event, receipt }) => {
    const { transactionHash } = receipt;

    // fetching amount
    if (BigInt(event.keys[0]) === TRANSFER_KEY) {
      const [fromAddress, toAddress, amountLow, amountHigh] = event.data;
      if (BigInt(toAddress) != NAMING_CONTRACT) return;

      lastTransfer = {
        from_address: fromAddress,
        amount: uint256.uint256ToBN({
          low: amountLow,
          high: amountHigh,
        }),
      };

      console.log("detected a payment of " + lastTransfer.amount);
      return;
    }

    if (BigInt(event.keys[0]) === STARK_UPDATE_KEY) {
      console.log("received a domain update");

      const arr_len = Number(event.data[0]);
      const expiry = Number(event.data[arr_len + 2]);

      const output = {
        domain: decodeDomain(
          event.data.slice(1, 1 + arr_len).map((number) => BigInt(number))
        ),
        type: "purchase",
        timestamp: new Date(timestamp),
        price: lastTransfer?.amount.toString(),
        payer: lastTransfer?.from_address,
        expiry,
        // auto
        // sponsor
        // sponsor_com
      };
      console.log(output);
      lastTransfer = null;
      return output;
    }

    return;
  });

  // Filter out null values
  return decodedEvents.filter(Boolean);
}
