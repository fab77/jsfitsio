/**
 * FITS serialization and file writing support.
 *
 * FITSWriter provides two serialization APIs:
 *
 * - The jsfitsio 3.x API serializes the FITSFile/HDU data model,
 *   including PrimaryHDU, ImageHDU, BinaryTableHDU and AsciiTableHDU.
 *
 * - The legacy API serializes the former FITSParsed representation
 *   and is retained for backward compatibility with jsfitsio 2.x
 *   consumers.
 *
 * FITS headers are serialized according to the FITS 80-character
 * card format and padded to 2880-byte FITS logical blocks.
 * HDU payloads are likewise padded to 2880-byte boundaries.
 *
 * New code should use FITSFile together with createFITSFile() and
 * writeFITSFileModel().
 *
 * @see https://fits.gsfc.nasa.gov/
 */

import { FITSHeaderManager } from "./model/FITSHeaderManager.js";
import { FITSParsed } from "./model/FITSParsed.js";
import { FITSFile } from "./model/FITSFile.js";
import { FITSHDU } from "./model/FITSHDU.js";
import * as fs from "fs";
import { FITSHeaderWriter } from "./FITSHeaderWriter.js";

export class FITSWriter {
  /**
   * Serializes the legacy FITSParsed representation.
   *
   * @deprecated Use createFITSFile() with the FITSFile/HDU model.
   * This method is retained for backward compatibility with jsfitsio 2.x.
   */
  static createFITS(fitsParsed: FITSParsed): Uint8Array {
    const headerBytes = FITSHeaderWriter.serialize(fitsParsed.header, true);

    const dataBytes = this.createData(fitsParsed.data, fitsParsed.header);

    const fitsFile = new Uint8Array(headerBytes.length + dataBytes.length);

    fitsFile.set(headerBytes, 0);
    fitsFile.set(dataBytes, headerBytes.length);

    return fitsFile;
  }

  private static createHDU(hdu: FITSHDU, primary: boolean): Uint8Array {
    const headerBytes = FITSHeaderWriter.serialize(hdu.header, primary);

    const rawData = hdu.rawData ?? new Uint8Array(0);

    if (rawData.byteLength !== hdu.dataByteLength) {
      throw new Error(
        `HDU payload length mismatch: ` +
          `rawData contains ${rawData.byteLength} bytes, ` +
          `but dataByteLength=${hdu.dataByteLength}.`,
      );
    }

    const dataBytes = FITSWriter.padData(rawData);

    const result = new Uint8Array(
      headerBytes.byteLength + dataBytes.byteLength,
    );

    result.set(headerBytes, 0);

    result.set(dataBytes, headerBytes.byteLength);

    return result;
  }

  private static padData(data: Uint8Array): Uint8Array {
    const BLOCK = 2880;
    if (data.byteLength === 0) {
      return new Uint8Array(0);
    }
    const remainder = data.byteLength % BLOCK;
    if (remainder === 0) {
      return data.slice();
    }
    const padded = new Uint8Array(data.byteLength + (BLOCK - remainder));
    padded.set(data);
    return padded;
  }

  private static createData(
    data: Array<Uint8Array>,
    header: FITSHeaderManager,
  ): Uint8Array {
    // concat
    const totalLength = data.reduce((s, c) => s + c.length, 0);

    // OPTIONAL: verify size from BITPIX/NAXIS
    const bitpix = Math.abs(Number(header.findById("BITPIX")?.value ?? 0));
    const naxis = Number(header.findById("NAXIS")?.value ?? 0);
    let elems = 1;
    for (let k = 1; k <= naxis; k++) {
      elems *= Number(header.findById(`NAXIS${k}`)?.value ?? 0);
    }
    const bytesPerElem = bitpix / 8;
    const expectedUnpadded = naxis > 0 ? elems * bytesPerElem : 0;

    if (expectedUnpadded && expectedUnpadded !== totalLength) {
      throw new Error(
        `Data length ${totalLength} does not match header expectation ${expectedUnpadded} (BITPIX=${bitpix}, NAXIS=${naxis})`,
      );
    }

    // build and pad
    let dataBytes = new Uint8Array(totalLength);
    let off = 0;
    for (const chunk of data) {
      dataBytes.set(chunk, off);
      off += chunk.length;
    }
    return FITSWriter.padData(dataBytes);
  }

  /**
   * Serializes a jsfitsio 3.x FITSFile, including all contained HDUs.
   */
  static createFITSFile(fitsFile: FITSFile): Uint8Array {
    if (fitsFile.length === 0) {
      throw new Error("Cannot write an empty FITSFile.");
    }
    if (fitsFile.primaryHDU === null) {
      throw new Error("FITSFile must start with a PrimaryHDU.");
    }
    const serializedHDUs = fitsFile.hdus.map((hdu, index) =>
      FITSWriter.createHDU(hdu, index === 0),
    );
    const totalLength = serializedHDUs.reduce(
      (sum, hdu) => sum + hdu.byteLength,
      0,
    );
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const hdu of serializedHDUs) {
      result.set(hdu, offset);
      offset += hdu.byteLength;
    }
    return result;
  }

  /**
   * Serializes a jsfitsio 3.x FITSFile and writes it to the local filesystem.
   */
  static writeFITSFileModel(fitsFile: FITSFile, filePath: string): void {
    const data = FITSWriter.createFITSFile(fitsFile);
    fs.writeFileSync(filePath, data);
  }

  /**
   * Writes the legacy FITSParsed representation to a local file.
   *
   * @deprecated Use writeFITSFileModel() with FITSFile instead.
   * This method is retained for backward compatibility with jsfitsio 2.x.
   */
  static writeFITSFile(fitsParsed: FITSParsed, filePath: string): void {
    const fitsFile = FITSWriter.createFITS(fitsParsed);
    fs.writeFileSync(filePath, fitsFile);
  }
}
