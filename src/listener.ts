import { hash, uint256, formatUnits } from "./deps.ts";
import { decodeDomain } from "./utils/starknetid.ts";

const DECIMALS = 18;
// Can read from environment variables if you want to.
// In that case, run with `--env-from-file .env` and put the following in .env:
// TOKEN_DECIMALS=18
// const DECIMALS = Deno.env.get('TOKEN_DECIMALS') ?? 18;

export const filter = {
  header: {
    weak: true,
  },
  events: [
    {
      fromAddress:
        "0x049D36570D4e46f48e99674bd3fcc84644DdD6b96F7C741B1562B82f9e004dC7",
      keys: [hash.getSelectorFromName("Transfer")],
    },
    {
      fromAddress:
        "0x6ac597f8116f886fa1c97a23fa4e08299975ecaf6b598873ca6792b9bbfb678",
      keys: [hash.getSelectorFromName("starknet_id_update")],
    },
  ],
};

const transfer_key = BigInt(hash.getSelectorFromName("Transfer"));
const stark_update_key = BigInt(hash.getSelectorFromName("starknet_id_update"));

export function decodeTransfersInBlock({ header, events }) {
  const { blockNumber, blockHash, timestamp } = header;

  let lastTransfer = null;

  const decodedEvents = events.map(({ event, receipt }) => {
    const { transactionHash } = receipt;
    if (BigInt(event.keys[0]) === transfer_key) {
      const [fromAddress, toAddress, amountLow, amountHigh] = event.data;
      const amountRaw = uint256.uint256ToBN({
        low: amountLow,
        high: amountHigh,
      });
      const amount = formatUnits(amountRaw, DECIMALS);

      lastTransfer = {
        from_address: fromAddress,
        to_address: toAddress,
        amount: +amount,
        amount_raw: amountRaw.toString(),
      };

      return null;
    }

    if (BigInt(event.keys[0]) === stark_update_key) {
      console.log("received a domain update");

      const arr_len = event.data[0];
      let domain = decodeDomain(event.data.slice(1, 1 + arr_len));
      return {
        network: "starknet-goerli",
        symbol: "ETH",
        block_hash: blockHash,
        block_number: +blockNumber,
        block_timestamp: timestamp,
        transaction_hash: transactionHash,
        domain: domain,
        price: lastTransfer?.amount,
        price_raw: lastTransfer?.amount_raw,
        from_address: lastTransfer?.from_address,
        to_address: lastTransfer?.to_address,
      };
    }

    return null;
  });

  // Filter out null values
  return decodedEvents.filter(Boolean);
}
