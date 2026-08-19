const FITS_CARD_SIZE = 80;
const FITS_BLOCK_SIZE = 2880;
const CARDS_PER_BLOCK = FITS_BLOCK_SIZE / FITS_CARD_SIZE;

export interface SyntheticFitsOptions {
  bitpix?: 8 | 16 | 32 | 64 | -32 | -64;

  shape?: number[];

  headerBlocks?: number;

  bzero?: number;
  bscale?: number;
  blank?: number;

  datamin?: number;
  datamax?: number;

  pixels?: Array<number | bigint>;
}

/**
 * Creates a standard FITS keyword/value card.
 *
 * FITS cards are exactly 80 ASCII characters.
 */
export function createValueCard(
  keyword: string,
  value: string | number | bigint | boolean,
  comment?: string,
): string {
  const key = keyword.padEnd(8, " ").slice(0, 8);

  let encodedValue: string;

  if (typeof value === "boolean") {
    encodedValue = value ? "T" : "F";
  } else if (typeof value === "string") {
    encodedValue = `'${value}'`;
  } else {
    encodedValue = String(value);
  }

  let card = `${key}= ${encodedValue}`;

  if (comment) {
    card += ` / ${comment}`;
  }

  return card.padEnd(FITS_CARD_SIZE, " ").slice(0, FITS_CARD_SIZE);
}

/**
 * Creates a COMMENT card.
 */
export function createCommentCard(comment: string): string {
  return `COMMENT ${comment}`
    .padEnd(FITS_CARD_SIZE, " ")
    .slice(0, FITS_CARD_SIZE);
}

/**
 * Creates the FITS END card.
 */
export function createEndCard(): string {
  return "END".padEnd(FITS_CARD_SIZE, " ");
}

/**
 * Creates a synthetic FITS file.
 *
 * The returned Uint8Array contains:
 *
 *   header blocks (N * 2880)
 *   +
 *   image payload
 *   +
 *   payload padding to 2880 bytes
 */
export function createSyntheticFits(
  options: SyntheticFitsOptions = {},
): Uint8Array {
  const {
    bitpix = 16,
    shape = [2, 1],
    headerBlocks = 1,
    bzero,
    bscale,
    blank,
    datamin,
    datamax,
    pixels = [-10, 20],
  } = options;

  if (headerBlocks < 1) {
    throw new Error("headerBlocks must be >= 1");
  }

  if (
    !shape.every((dimension) => Number.isInteger(dimension) && dimension >= 0)
  ) {
    throw new Error(`Invalid FITS shape: [${shape.join(", ")}]`);
  }

  const expectedPixelCount =
    shape.length === 0
      ? 0
      : shape.reduce((total, dimension) => total * dimension, 1);

  if (pixels.length !== expectedPixelCount) {
    throw new Error(
      `Expected ${expectedPixelCount} pixels, got ${pixels.length}`,
    );
  }

  const cards: string[] = [
    createValueCard("SIMPLE", true, "conforms to FITS standard"),
    createValueCard("BITPIX", bitpix),
    createValueCard("NAXIS", shape.length),
  ];

  shape.forEach((dimension, index) => {
    cards.push(createValueCard(`NAXIS${index + 1}`, dimension));
  });

  if (bzero !== undefined) {
    cards.push(createValueCard("BZERO", bzero));
  }

  if (bscale !== undefined) {
    cards.push(createValueCard("BSCALE", bscale));
  }

  if (blank !== undefined) {
    cards.push(createValueCard("BLANK", blank));
  }

  if (datamin !== undefined) {
    cards.push(createValueCard("DATAMIN", datamin));
  }

  if (datamax !== undefined) {
    cards.push(createValueCard("DATAMAX", datamax));
  }

  /*
   * END must be placed inside the requested block.
   *
   * If headerBlocks = 2:
   *
   *   block #1 = 36 complete cards
   *
   *   block #2:
   *       COMMENT
   *       END
   *       padding...
   *
   * This guarantees that a parser hard-coded to 2880 bytes fails.
   */
  const firstCardInLastBlock = (headerBlocks - 1) * CARDS_PER_BLOCK;

  while (cards.length <= firstCardInLastBlock) {
    cards.push(createCommentCard(`synthetic header filler ${cards.length}`));
  }

  cards.push(createEndCard());

  const headerText = cards.join("");

  const headerByteLength = headerBlocks * FITS_BLOCK_SIZE;

  if (headerText.length > headerByteLength) {
    throw new Error(`Header does not fit into ${headerBlocks} FITS block(s)`);
  }

  const paddedHeader = headerText.padEnd(headerByteLength, " ");

  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(paddedHeader);

  const payload = createPayload(bitpix, pixels);

  const paddedPayloadLength =
    payload.byteLength === 0
      ? 0
      : Math.ceil(payload.byteLength / FITS_BLOCK_SIZE) * FITS_BLOCK_SIZE;

  const fits = new Uint8Array(headerBytes.byteLength + paddedPayloadLength);

  fits.set(headerBytes, 0);

  fits.set(payload, headerBytes.byteLength);

  return fits;
}

/**
 * Encode image pixels according to FITS BITPIX.
 *
 * FITS numerical data is big-endian.
 */
export function createPayload(
  bitpix: 8 | 16 | 32 | 64 | -32 | -64,
  values: Array<number | bigint>,
): Uint8Array {
  const bytesPerElement = Math.abs(bitpix) / 8;

  const buffer = new ArrayBuffer(values.length * bytesPerElement);

  const view = new DataView(buffer);

  values.forEach((value, index) => {
    const offset = index * bytesPerElement;

    switch (bitpix) {
      case 8:
        view.setUint8(offset, Number(value));
        break;

      case 16:
        view.setInt16(offset, Number(value), false);
        break;

      case 32:
        view.setInt32(offset, Number(value), false);
        break;

      case 64:
        view.setBigInt64(
          offset,
          typeof value === "bigint" ? value : BigInt(value),
          false,
        );
        break;

      case -32:
        view.setFloat32(offset, Number(value), false);
        break;

      case -64:
        view.setFloat64(offset, Number(value), false);
        break;

      default:
        throw new Error(`Unsupported BITPIX: ${bitpix}`);
    }
  });

  return new Uint8Array(buffer);
}

export const FITS_TEST_CONSTANTS = {
  CARD_SIZE: FITS_CARD_SIZE,
  BLOCK_SIZE: FITS_BLOCK_SIZE,
  CARDS_PER_BLOCK,
};
