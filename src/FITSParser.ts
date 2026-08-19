import { FITSWriter } from "./FITSWriter.js";
import { ParsePayload } from "./ParsePayload.js";
import { ParseHeader } from "./ParseHeader.js";
// import { FITSHeader } from "./model/FITSHeader.js";
import { FITSParsed } from "./model/FITSParsed.js";
import { FITSHeaderManager } from "./model/FITSHeaderManager.js";
import { FITSFile } from "./model/FITSFile.js";
import { PrimaryHDU } from "./model/PrimaryHDU.js";
import { FITSImageUtils } from "./FITSImageUtils.js";
import { ImageHDU } from "./model/ImageHDU.js";
import { BinaryTableHDU } from "./model/BinaryTableHDU.js";
import { FITSBinaryTableUtils } from "./FITSBinaryTableUtils.js";
import {
  FITSBinaryTableColumn,
  FITSBinaryTableColumnType,
} from "./model/FITSBinaryTableColumn.js";

export class FITSParser {
  static async loadFITS(path: string): Promise<FITSParsed | null> {
    const fitsFile = await FITSParser.loadFITSFile(path);

    if (fitsFile === null) {
      return null;
    }

    const primary = fitsFile.primaryHDU;

    if (primary === null || primary.rawData === null) {
      return null;
    }

    const shape = FITSImageUtils.getShape(primary.header);

    if (shape.length !== 2) {
      throw new Error(
        "Legacy loadFITS() supports only 2D FITS images. " +
          "Use loadFITSFile() for N-dimensional images.",
      );
    }

    return {
      header: primary.header,

      data: FITSParser.createMatrix(primary.rawData, primary.header),
    };
  }

  static async loadFITSFile(path: string): Promise<FITSFile | null> {
    const rawData = await FITSParser.getFile(path);

    if (rawData.byteLength === 0) {
      return null;
    }

    return FITSParser.processFITSFile(rawData);
  }

  private static processFITSFile(rawData: Uint8Array): FITSFile {
    const fitsFile = new FITSFile();

    let offset = 0;
    let hduIndex = 0;

    while (offset < rawData.byteLength) {
      /*
       * Ignore trailing zero/space padding.
       */
      if (FITSParser.isPaddingOnly(rawData, offset)) {
        break;
      }

      const header = ParseHeader.parse(rawData, offset);

      const headerByteLength = ParseHeader.getHeaderByteLength(rawData, offset);

      const dataOffset = offset + headerByteLength;

      const hduType = FITSParser.getHDUType(header, hduIndex);

      switch (hduType) {
        case "PRIMARY":
        case "IMAGE": {
          const dataByteLength = FITSParser.getImagePayloadByteLength(header);

          if (dataOffset + dataByteLength > rawData.byteLength) {
            throw new Error(
              `Invalid FITS HDU ${hduIndex}: ` +
                `expected ${dataByteLength} payload bytes ` +
                `at offset ${dataOffset}, but only ` +
                `${rawData.byteLength - dataOffset} remain.`,
            );
          }

          const rawPayload = rawData.subarray(
            dataOffset,
            dataOffset + dataByteLength,
          );

          const hdu = FITSParser.createImageHDU(
            header,
            rawPayload,
            dataOffset,
            dataByteLength,
            hduIndex === 0,
          );

          fitsFile.addHDU(hdu);

          const paddedPayloadLength =
            FITSParser.getPaddedByteLength(dataByteLength);

          offset = dataOffset + paddedPayloadLength;

          break;
        }

        case "BINTABLE": {
          const dataByteLength =
            FITSParser.getBinaryTablePayloadByteLength(header);

          if (dataOffset + dataByteLength > rawData.byteLength) {
            throw new Error(`Invalid BINTABLE HDU ${hduIndex}.`);
          }

          const rawPayload = rawData.subarray(
            dataOffset,
            dataOffset + dataByteLength,
          );

          const hdu = FITSParser.createBinaryTableHDU(
            header,
            rawPayload,
            dataOffset,
            dataByteLength,
          );

          fitsFile.addHDU(hdu);

          offset = dataOffset + FITSParser.getPaddedByteLength(dataByteLength);

          break;
        }
        case "TABLE":
          throw new Error("ASCII FITS TABLE support is not implemented yet.");

        default:
          throw new Error(`Unsupported FITS HDU type at index ${hduIndex}.`);
      }

      hduIndex++;
    }

    return fitsFile;
  }

  private static getPaddedByteLength(byteLength: number): number {
    if (byteLength === 0) {
      return 0;
    }

    return (
      Math.ceil(byteLength / ParseHeader.BLOCK_SIZE) * ParseHeader.BLOCK_SIZE
    );
  }

  private static isPaddingOnly(rawData: Uint8Array, offset: number): boolean {
    for (let i = offset; i < rawData.byteLength; i++) {
      const value = rawData[i];

      if (value !== 0x00 && value !== 0x20) {
        return false;
      }
    }

    return true;
  }

  private static getHDUType(
    header: FITSHeaderManager,
    index: number,
  ): "PRIMARY" | "IMAGE" | "BINTABLE" | "TABLE" | "UNKNOWN" {
    if (index === 0) {
      return "PRIMARY";
    }

    const xtension = ParseHeader.getFITSItemStringValue(
      header,
      FITSHeaderManager.XTENSION,
    );

    if (xtension === null) {
      return "UNKNOWN";
    }

    switch (xtension.toUpperCase()) {
      case "IMAGE":
        return "IMAGE";

      case "BINTABLE":
        return "BINTABLE";

      case "TABLE":
        return "TABLE";

      default:
        return "UNKNOWN";
    }
  }

  private static createImageHDU(
    header: FITSHeaderManager,
    rawPayload: Uint8Array,
    dataOffset: number,
    dataByteLength: number,
    primary: boolean,
  ): PrimaryHDU | ImageHDU {
    
    const finalHeader =
      ParsePayload.computePhysicalMinAndMax(header, rawPayload) ?? header;

    const bitpix = ParseHeader.getFITSItemValue(
      finalHeader,
      FITSHeaderManager.BITPIX,
    );

    if (bitpix === null) {
      throw new Error("BITPIX not defined.");
    }

    const shape = FITSImageUtils.getShape(finalHeader);

    const typedData = ParsePayload.createTypedArray(rawPayload, bitpix);

    if (primary) {
      return new PrimaryHDU(
        finalHeader,
        rawPayload,
        dataOffset,
        dataByteLength,
        bitpix,
        shape,
        typedData,
      );
    }

    return new ImageHDU(
      finalHeader,
      rawPayload,
      dataOffset,
      dataByteLength,
      bitpix,
      shape,
      typedData,
    );
  }

  private static getImagePayloadByteLength(header: FITSHeaderManager): number {
    const bitpix = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.BITPIX,
    );

    if (bitpix === null) {
      throw new Error("BITPIX not defined.");
    }

    ParsePayload.assertSupportedBITPIX(bitpix);

    const shape = FITSImageUtils.getShape(header);

    if (shape.length === 0) {
      return 0;
    }

    const elementCount = shape.reduce(
      (total, dimension) => total * dimension,
      1,
    );

    const bytesPerElement = Math.abs(bitpix) / 8;

    return elementCount * bytesPerElement;
  }

  private static getBinaryTablePayloadByteLength(
    header: FITSHeaderManager,
  ): number {
    const rowByteLength = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS1,
    );

    const rowCount = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS2,
    );

    const pcount =
      ParseHeader.getFITSItemValue(header, FITSHeaderManager.PCOUNT) ?? 0;

    if (rowByteLength === null || rowCount === null) {
      throw new Error("BINTABLE requires NAXIS1 and NAXIS2.");
    }

    return rowByteLength * rowCount + pcount;
  }

  private static getBinaryTableColumns(
    header: FITSHeaderManager,
  ): FITSBinaryTableColumn[] {
    const fieldCount = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.TFIELDS,
    );

    if (fieldCount === null) {
      throw new Error("BINTABLE requires TFIELDS.");
    }

    const columns: FITSBinaryTableColumn[] = [];

    let byteOffset = 0;

    for (let index = 1; index <= fieldCount; index++) {
      const tform = ParseHeader.getFITSItemStringValue(
        header,
        FITSHeaderManager.tableFieldKey("TFORM", index),
      );

      if (tform === null) {
        throw new Error(`Missing TFORM${index}.`);
      }

      const parsed = FITSBinaryTableUtils.parseTFORM(tform);

      const name = ParseHeader.getFITSItemStringValue(
        header,
        FITSHeaderManager.tableFieldKey("TTYPE", index),
      );

      const unit = ParseHeader.getFITSItemStringValue(
        header,
        FITSHeaderManager.tableFieldKey("TUNIT", index),
      );

      columns.push({
        index,
        name,
        format: tform,
        type: FITSParser.mapBinaryType(parsed.code),

        repeat: parsed.repeat,

        byteOffset,
        byteWidth: parsed.byteWidth,

        unit,

        scale:
          ParseHeader.getFITSItemValue(
            header,
            FITSHeaderManager.tableFieldKey("TSCAL", index),
          ) ?? 1,

        zero:
          ParseHeader.getFITSItemValue(
            header,
            FITSHeaderManager.tableFieldKey("TZERO", index),
          ) ?? 0,

        nullValue: ParseHeader.getFITSItemValue(
          header,
          FITSHeaderManager.tableFieldKey("TNULL", index),
        ),
      });

      byteOffset += parsed.byteWidth;
    }

    return columns;
  }

  private static mapBinaryType(code: string): FITSBinaryTableColumnType {
    switch (code.toUpperCase()) {
      case "L":
        return "LOGICAL";
      case "X":
        return "BIT";
      case "B":
        return "UINT8";
      case "I":
        return "INT16";
      case "J":
        return "INT32";
      case "K":
        return "INT64";
      case "A":
        return "CHAR";
      case "E":
        return "FLOAT32";
      case "D":
        return "FLOAT64";
      case "C":
        return "COMPLEX64";
      case "M":
        return "COMPLEX128";
      default:
        return "UNKNOWN";
    }
  }
  private static createBinaryTableHDU(
    header: FITSHeaderManager,
    rawPayload: Uint8Array,
    dataOffset: number,
    dataByteLength: number,
  ): BinaryTableHDU {
    const rowByteLength = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS1,
    );

    const rowCount = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS2,
    );

    if (rowByteLength === null || rowCount === null) {
      throw new Error("Invalid BINTABLE header.");
    }

    const columns = FITSParser.getBinaryTableColumns(header);

    const columnsByteWidth = columns.reduce(
      (sum, column) => sum + column.byteWidth,
      0,
    );

    if (columnsByteWidth !== rowByteLength) {
      throw new Error(
        `BINTABLE columns occupy ${columnsByteWidth} bytes per row, ` +
          `but NAXIS1=${rowByteLength}.`,
      );
    }

    return new BinaryTableHDU(
      header,
      rawPayload,
      dataOffset,
      dataByteLength,
      rowByteLength,
      rowCount,
      columns,
    );
  }

  private static createMatrix(
    payload: Uint8Array,
    header: FITSHeaderManager,
  ): Array<Uint8Array> {
    const NAXIS1 = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS1,
    );
    if (NAXIS1 === null) {
      throw new Error("NAXIS1 not defined.");
    }
    const NAXIS2 = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS2,
    );
    if (NAXIS2 === null) {
      throw new Error("NAXIS2 not defined.");
    }
    const BITPIX = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.BITPIX,
    );
    if (BITPIX === null) {
      throw new Error("BITPIX not defined.");
    }

    const bytesXelem = Math.abs(BITPIX / 8);

    // if (payload.length !== NAXIS1 * NAXIS2 * bytesXelem) {
    //   throw new Error("Payload size does not match the expected matrix dimensions.");
    // }

    // const matrix: Array<Uint8Array> = [];
    const matrix = [];
    for (let i = 0; i < NAXIS2; i++) {
      matrix.push(
        payload.slice(i * NAXIS1 * bytesXelem, (i + 1) * NAXIS1 * bytesXelem),
      );
    }

    return matrix;
  }

  // static generateFITSForWeb(fitsParsed: FITSParsed) {
  //   return FITSWriter.typedArrayToURL(fitsParsed)
  // }

  static saveFITSLocally(fitsParsed: FITSParsed, path: string) {
    return FITSWriter.writeFITSFile(fitsParsed, path);
  }

  private static async getFile(uri: string): Promise<Uint8Array> {
    if (!uri.substring(0, 5).toLowerCase().includes("http")) {
      const p = await import("./getLocalFile.js");
      const rawData = await p.getLocalFile(uri);
      if (rawData?.length) {
        const uint8 = new Uint8Array(rawData);
        return uint8;
      }
      return new Uint8Array(0);
    } else {
      const p = await import("./getFile.js");
      const rawData = await p.getFile(uri);
      if (rawData?.byteLength) {
        const uint8 = new Uint8Array(rawData);
        return uint8;
      }
      return new Uint8Array(0);
    }
  }
}

// const url = "http://skies.esac.esa.int/Herschel/normalized/PACS_hips160//Norder8/Dir40000/Npix47180.fits"
// FITSParser.loadFITS(url).then((fits) => {
//   if (fits == null) {
//     return null
//   }
//   const path = "./fitsTest1.fits"
//   console.log(fits.header)
//   FITSParser.saveFITSLocally(fits, path)
//   console.log("finished")
// })

// // const file = "/Users/fabriziogiordano/Desktop/PhD/code/new/FITSParser/tests/inputs/empty.fits"
// const file = "/Users/fabriziogiordano/Desktop/PhD/code/new/FITSParser/tests/inputs/Npix43348.fits"
// FITSParser.loadFITS(file).then((fits) => {
//   if (fits == null) {
//     return null
//   }
//   const path = "./fitsTest2.fits"
//   console.log(fits.header)
//   FITSParser.saveFITSLocally(fits, path)
//   console.log("finished")
// })
