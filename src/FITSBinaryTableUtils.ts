export interface ParsedTFORM {
  repeat: number;
  code: string;
  byteWidth: number;
}

export class FITSBinaryTableUtils {
  static parseTFORM(format: string): ParsedTFORM {
    const normalized = format
      .trim()
      .replace(/^'/, "")
      .replace(/'$/, "")
      .trim()
      .toUpperCase();

    const match = normalized.match(/^(\d*)([LXBIJKAEDCM])$/);

    if (!match) {
      throw new Error(`Unsupported FITS TFORM value: ${format}`);
    }

    const repeat = match[1] ? Number(match[1]) : 1;

    const code = match[2];

    const bytesPerElement = FITSBinaryTableUtils.bytesPerType(code);

    return {
      repeat,
      code,
      byteWidth:
        code === "X" ? Math.ceil(repeat / 8) : repeat * bytesPerElement,
    };
  }

  private static bytesPerType(code: string): number {
    switch (code) {
      case "L":
      case "B":
      case "A":
        return 1;

      case "I":
        return 2;

      case "J":
      case "E":
        return 4;

      case "K":
      case "D":
        return 8;

      case "C":
        return 8;

      case "M":
        return 16;

      case "X":
        return 0;

      default:
        throw new Error(`Unsupported FITS binary table type: ${code}`);
    }
  }
}

