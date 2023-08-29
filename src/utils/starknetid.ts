const ZERO = 0n;
const basicAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789-";
const basicSizePlusOne = BigInt(basicAlphabet.length + 1);
const bigAlphabet = "这来";
const bigAlphabetSize = BigInt(bigAlphabet.length);
const bigAlphabetSizePlusOne = BigInt(bigAlphabet.length + 1);

function extractStars(str: string): [string, number] {
  let k = 0;
  while (str.endsWith(bigAlphabet[bigAlphabet.length - 1])) {
    str = str.substring(0, str.length - 1);
    k += 1;
  }
  return [str, k];
}

/**
 * Decode bigint into string
 * @param bigint
 * @returns string
 */
function decode(felt: bigint) {
  let decoded = "";
  while (felt !== ZERO) {
    const code = felt % basicSizePlusOne;
    felt /= basicSizePlusOne;
    if (code === BigInt(basicAlphabet.length)) {
      const nextSubdomain = felt / bigAlphabetSizePlusOne;
      if (nextSubdomain === ZERO) {
        const code2 = felt % bigAlphabetSizePlusOne;
        felt = nextSubdomain;
        if (code2 === ZERO) decoded += basicAlphabet[0];
        else decoded += bigAlphabet[Number(code2) - 1];
      } else {
        const code2 = felt % bigAlphabetSize;
        decoded += bigAlphabet[Number(code2)];
        felt /= bigAlphabetSize;
      }
    } else decoded += basicAlphabet[Number(code)];
  }

  const [str, k] = extractStars(decoded);
  if (k)
    decoded =
      str +
      (k % 2 === 0
        ? bigAlphabet[bigAlphabet.length - 1].repeat(k / 2 - 1) +
          bigAlphabet[0] +
          basicAlphabet[1]
        : bigAlphabet[bigAlphabet.length - 1].repeat((k - 1) / 2 + 1));

  return decoded;
}

/**
 * Decode starknetid domain represented as an array of bigint [454245n] -> 'test.stark'
 * @param bigint[]
 * @returns string
 */
export function decodeDomain(encoded: bigint[]): string {
  let decoded = "";

  encoded.forEach((subdomain) => {
    decoded += decode(subdomain);
    if (decoded) decoded += ".";
  });

  if (!decoded) {
    return decoded;
  }

  return decoded.concat("stark");
}
