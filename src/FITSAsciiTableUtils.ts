export interface ParsedAsciiTFORM {
  code: string;
  width: number;
  decimals: number | null;
}

export class FITSAsciiTableUtils {
  static parseTFORM(
    format: string,
  ): ParsedAsciiTFORM {
    const normalized =
      format
        .trim()
        .replace(/^'/, "")
        .replace(/'$/, "")
        .trim()
        .toUpperCase();

    /*
     * FITS ASCII table formats:
     *
     *   Aw
     *   Iw
     *   Fw.d
     *   Ew.d
     *   Dw.d
     */
    const match =
      normalized.match(
        /^([AIFED])(\d+)(?:\.(\d+))?$/,
      );

    if (!match) {
      throw new Error(
        `Unsupported FITS ASCII table TFORM value: ${format}`,
      );
    }

    const code =
      match[1];

    const width =
      Number(match[2]);

    const decimals =
      match[3] !== undefined
        ? Number(match[3])
        : null;

    if (
      !Number.isInteger(width) ||
      width <= 0
    ) {
      throw new Error(
        `Invalid FITS ASCII table field width: ${width}`,
      );
    }

    if (
      code === "A" ||
      code === "I"
    ) {
      if (decimals !== null) {
        throw new Error(
          `TFORM ${format} must not specify decimal places.`,
        );
      }
    } else if (decimals === null) {
      throw new Error(
        `TFORM ${format} requires decimal places.`,
      );
    }

    return {
      code,
      width,
      decimals,
    };
  }
}