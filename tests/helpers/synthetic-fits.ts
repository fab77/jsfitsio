const FITS_CARD_SIZE = 80;
const FITS_BLOCK_SIZE = 2880;
const CARDS_PER_BLOCK = FITS_BLOCK_SIZE / FITS_CARD_SIZE;

export interface SyntheticAsciiTableColumn {
  name: string;
  format: string;

  /**
   * FITS TBCOL value, 1-based.
   */
  startColumn: number;

  unit?: string;
}

export interface SyntheticAsciiTableHDUOptions {
  rowByteLength: number;

  columns: SyntheticAsciiTableColumn[];

  rows: string[];
}

export interface SyntheticCubeOptions {
  bitpix?: 8 | 16 | 32 | 64 | -32 | -64;

  shape?: [number, number, number];

  pixels?: Array<number | bigint>;

  headerBlocks?: number;
}

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

export interface SyntheticBinaryTableColumn {
  name: string;
  format: string;
}

export interface SyntheticBinaryTableHDUOptions {
  columns: SyntheticBinaryTableColumn[];
  rows: Uint8Array[];
}

export interface SyntheticImageHDUOptions {
  primary?: boolean;

  bitpix?: 8 | 16 | 32 | 64 | -32 | -64;

  shape?: number[];

  pixels?: Array<number | bigint>;

  headerBlocks?: number;
}

export function createSyntheticCubeFits(
  options: SyntheticCubeOptions = {},
): Uint8Array {
  const { bitpix = 16, shape = [4, 3, 2], headerBlocks = 1, pixels } = options;

  if (shape.length !== 3) {
    throw new Error(
      `Synthetic cube requires exactly 3 dimensions, got [${shape.join(", ")}]`,
    );
  }

  const elementCount = shape.reduce((total, dimension) => total * dimension, 1);

  const cubePixels =
    pixels ??
    Array.from(
      {
        length: elementCount,
      },
      (_, index) => index + 1,
    );

  if (cubePixels.length !== elementCount) {
    throw new Error(
      `Expected ${elementCount} cube elements, got ${cubePixels.length}`,
    );
  }

  return createSyntheticFits({
    bitpix,
    shape,
    headerBlocks,
    pixels: cubePixels,
  });
}

export function createSyntheticImageHDU(
  options: SyntheticImageHDUOptions = {},
): Uint8Array {
  const {
    primary = false,
    bitpix = 16,
    shape = [2, 1],
    pixels = [-10, 20],
    headerBlocks = 1,
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

  const cards: string[] = [];

  if (primary) {
    cards.push(createValueCard("SIMPLE", true, "conforms to FITS standard"));
  } else {
    cards.push(createValueCard("XTENSION", "IMAGE   ", "Image extension"));
  }

  cards.push(
    createValueCard("BITPIX", bitpix),
    createValueCard("NAXIS", shape.length),
  );

  shape.forEach((dimension, index) => {
    cards.push(createValueCard(`NAXIS${index + 1}`, dimension));
  });

  /*
   * FITS image extensions require PCOUNT and GCOUNT.
   */
  if (!primary) {
    cards.push(createValueCard("PCOUNT", 0));

    cards.push(createValueCard("GCOUNT", 1));
  }

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

  const result = new Uint8Array(headerBytes.byteLength + paddedPayloadLength);

  result.set(headerBytes, 0);

  result.set(payload, headerBytes.byteLength);

  return result;
}

export function createSyntheticMultiHDUFits(hdus: Uint8Array[]): Uint8Array {
  const totalLength = hdus.reduce((sum, hdu) => sum + hdu.byteLength, 0);

  const result = new Uint8Array(totalLength);

  let offset = 0;

  for (const hdu of hdus) {
    result.set(hdu, offset);

    offset += hdu.byteLength;
  }

  return result;
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

function parseSyntheticTFORMWidth(format: string): number {
  const normalized = format
    .trim()
    .replace(/^'/, "")
    .replace(/'$/, "")
    .toUpperCase();

  const match = normalized.match(/^(\d*)([LXBIJKAEDCM])$/);

  if (!match) {
    throw new Error(`Unsupported synthetic TFORM: ${format}`);
  }

  const repeat = match[1] ? Number(match[1]) : 1;

  const code = match[2];

  switch (code) {
    case "L":
    case "B":
    case "A":
      return repeat;

    case "X":
      return Math.ceil(repeat / 8);

    case "I":
      return repeat * 2;

    case "J":
    case "E":
      return repeat * 4;

    case "K":
    case "D":
    case "C":
      return repeat * 8;

    case "M":
      return repeat * 16;

    default:
      throw new Error(`Unsupported synthetic TFORM: ${format}`);
  }
}

export function createSyntheticBinaryTableHDU(
  options: SyntheticBinaryTableHDUOptions,
): Uint8Array {
  const { columns, rows } = options;

  const declaredRowByteLength = columns.reduce(
    (sum, column) => sum + parseSyntheticTFORMWidth(column.format),
    0,
  );

  const rowByteLength =
    rows.length > 0 ? rows[0].byteLength : declaredRowByteLength;

  if (rowByteLength !== declaredRowByteLength) {
    throw new Error(
      `BINTABLE row length mismatch: columns define ` +
        `${declaredRowByteLength} bytes, but rows contain ` +
        `${rowByteLength} bytes.`,
    );
  }

  for (const row of rows) {
    if (row.byteLength !== rowByteLength) {
      throw new Error("All BINTABLE rows must have equal length.");
    }
  }

  const cards: string[] = [
    createValueCard("XTENSION", "BINTABLE"),

    createValueCard("BITPIX", 8),

    createValueCard("NAXIS", 2),

    createValueCard("NAXIS1", rowByteLength),

    createValueCard("NAXIS2", rows.length),

    createValueCard("PCOUNT", 0),

    createValueCard("GCOUNT", 1),

    createValueCard("TFIELDS", columns.length),
  ];

  columns.forEach((column, index) => {
    cards.push(createValueCard(`TTYPE${index + 1}`, column.name));

    cards.push(createValueCard(`TFORM${index + 1}`, column.format));
  });

  cards.push(createEndCard());

  const headerText = cards.join("");

  const headerByteLength =
    Math.ceil(headerText.length / FITS_BLOCK_SIZE) * FITS_BLOCK_SIZE;

  const paddedHeader = headerText.padEnd(headerByteLength, " ");

  const encoder = new TextEncoder();

  const headerBytes = encoder.encode(paddedHeader);

  const payloadByteLength = rowByteLength * rows.length;

  const paddedPayloadLength =
    payloadByteLength === 0
      ? 0
      : Math.ceil(payloadByteLength / FITS_BLOCK_SIZE) * FITS_BLOCK_SIZE;

  const result = new Uint8Array(headerBytes.byteLength + paddedPayloadLength);

  result.set(headerBytes, 0);

  let payloadOffset = headerBytes.byteLength;

  for (const row of rows) {
    result.set(row, payloadOffset);

    payloadOffset += row.byteLength;
  }

  return result;
}

export function createSyntheticAsciiTableHDU(
  options: SyntheticAsciiTableHDUOptions,
): Uint8Array {
  const { rowByteLength, columns, rows } = options;

  if (!Number.isInteger(rowByteLength) || rowByteLength <= 0) {
    throw new Error(`Invalid ASCII TABLE rowByteLength=${rowByteLength}.`);
  }

  const cards: string[] = [
    createValueCard("XTENSION", "TABLE   "),

    createValueCard("BITPIX", 8),

    createValueCard("NAXIS", 2),

    createValueCard("NAXIS1", rowByteLength),

    createValueCard("NAXIS2", rows.length),

    createValueCard("PCOUNT", 0),

    createValueCard("GCOUNT", 1),

    createValueCard("TFIELDS", columns.length),
  ];

  columns.forEach((column, index) => {
    const field = index + 1;

    cards.push(createValueCard(`TTYPE${field}`, column.name));

    cards.push(createValueCard(`TBCOL${field}`, column.startColumn));

    cards.push(createValueCard(`TFORM${field}`, column.format));

    if (column.unit !== undefined) {
      cards.push(createValueCard(`TUNIT${field}`, column.unit));
    }
  });

  cards.push(createEndCard());

  const headerText = cards.join("");

  const headerByteLength =
    Math.ceil(headerText.length / FITS_BLOCK_SIZE) * FITS_BLOCK_SIZE;

  const headerBytes = new TextEncoder().encode(
    headerText.padEnd(headerByteLength, " "),
  );

  /*
   * Every ASCII TABLE row occupies exactly NAXIS1 bytes.
   */
  const payload = new Uint8Array(rowByteLength * rows.length);

  payload.fill(0x20);

  const encoder = new TextEncoder();

  rows.forEach((row, rowIndex) => {
    if (row.length > rowByteLength) {
      throw new Error(
        `ASCII TABLE row ${rowIndex} has ${row.length} characters, ` +
          `but NAXIS1=${rowByteLength}.`,
      );
    }

    const encoded = encoder.encode(row.padEnd(rowByteLength, " "));

    payload.set(encoded, rowIndex * rowByteLength);
  });

  const paddedPayloadLength =
    payload.byteLength === 0
      ? 0
      : Math.ceil(payload.byteLength / FITS_BLOCK_SIZE) * FITS_BLOCK_SIZE;

  const result = new Uint8Array(headerBytes.byteLength + paddedPayloadLength);

  result.set(headerBytes, 0);

  result.set(payload, headerBytes.byteLength);

  return result;
}
