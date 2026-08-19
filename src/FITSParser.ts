import { FITSWriter } from "./FITSWriter.js";
import { ParsePayload } from "./ParsePayload.js";
import { ParseHeader } from "./ParseHeader.js";
// import { FITSHeader } from "./model/FITSHeader.js";
import { FITSParsed } from "./model/FITSParsed.js";
import { FITSHeaderManager } from "./model/FITSHeaderManager.js";
import { FITSFile } from "./model/FITSFile.js";
import { PrimaryHDU } from "./model/PrimaryHDU.js";

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
    const header = ParseHeader.parse(rawData);

    const dataOffset = ParseHeader.getHeaderByteLength(rawData);

    const dataByteLength = FITSParser.getImagePayloadByteLength(header);

    if (dataOffset + dataByteLength > rawData.byteLength) {
      throw new Error(
        `Invalid FITS file: expected ` +
          `${dataByteLength} payload bytes ` +
          `at offset ${dataOffset}, but file ` +
          `contains only ` +
          `${rawData.byteLength - dataOffset}.`,
      );
    }

    const rawPayload = rawData.subarray(
      dataOffset,
      dataOffset + dataByteLength,
    );

    const finalHeader = ParsePayload.computePhysicalMinAndMax(
      header,
      rawPayload,
    );

    if (finalHeader === null) {
      throw new Error("Unable to parse FITS primary HDU.");
    }

    const primary = new PrimaryHDU(
      finalHeader,
      rawPayload,
      dataOffset,
      dataByteLength,
    );

    return new FITSFile([primary]);
  }

  private static processFits(rawData: Uint8Array): FITSParsed | null {
    const header = ParseHeader.parse(rawData);

    const dataOffset = ParseHeader.getHeaderByteLength(rawData);

    const payloadLength = FITSParser.getImagePayloadByteLength(header);

    if (dataOffset + payloadLength > rawData.byteLength) {
      throw new Error(
        `Invalid FITS file: expected ${payloadLength} payload bytes ` +
          `at offset ${dataOffset}, but file contains only ` +
          `${rawData.byteLength - dataOffset}.`,
      );
    }

    const payload = rawData.subarray(dataOffset, dataOffset + payloadLength);

    const finalHeader = ParsePayload.computePhysicalMinAndMax(header, payload);

    if (finalHeader === null) {
      return null;
    }

    return {
      header: finalHeader,
      data: FITSParser.createMatrix(payload, header),
    };
  }

  private static getImagePayloadByteLength(header: FITSHeaderManager): number {
    const bitpix = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.BITPIX,
    );

    const naxis1 = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS1,
    );

    const naxis2 = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS2,
    );

    if (bitpix === null) {
      throw new Error("BITPIX not defined.");
    }

    if (naxis1 === null || naxis2 === null) {
      throw new Error("NAXIS1/NAXIS2 not defined.");
    }

    ParsePayload.assertSupportedBITPIX(bitpix);

    const bytesPerElement = Math.abs(bitpix) / 8;

    return naxis1 * naxis2 * bytesPerElement;
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
