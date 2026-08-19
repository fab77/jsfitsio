// "use strict";

/**
 * Summary. (bla bla bla)
 *
 * Description. (bla bla bla)
 *
 * @link   github https://github.com/fab77/FITSParser
 * @author Fabrizio Giordano <fabriziogiordano77@gmail.com>
 */
import { FITSHeaderItem } from "./model/FITSHeaderItem.js";
import { FITSHeaderManager } from "./model/FITSHeaderManager.js";
import { ParseHeader } from "./ParseHeader.js";
import { ParseUtils } from "./ParseUtils.js";

export class ParsePayload {

  static readonly SUPPORTED_BITPIX = new Set([
    8,
    16,
    32,
    64,
    -32,
    -64,
  ]);

  static assertSupportedBITPIX(bitpix: number): void {
    if (!ParsePayload.SUPPORTED_BITPIX.has(bitpix)) {
      throw new Error(
        `Unsupported FITS BITPIX value: ${bitpix}`
      );
    }
  }

  private static extractPixelFromView(
    view: DataView,
    offset: number,
    bitpix: number
  ): number {
    switch (bitpix) {
      case 8:
        return view.getUint8(offset);

      case 16:
        return view.getInt16(offset, false);

      case 32:
        return view.getInt32(offset, false);

      case -32:
        return view.getFloat32(offset, false);

      case -64:
        return view.getFloat64(offset, false);

      case 64: {
        const value = view.getBigInt64(offset, false);

        const numeric = Number(value);

        if (!Number.isSafeInteger(numeric)) {
          throw new RangeError(
            `BITPIX=64 value ${value} cannot be represented ` +
            `exactly as a JavaScript number.`
          );
        }

        return numeric;
      }

      default:
        throw new Error(
          `Unsupported FITS BITPIX value: ${bitpix}`
        );
    }
  }


  static computePhysicalMinAndMax(
    header: FITSHeaderManager,
    payload: Uint8Array
  ): FITSHeaderManager | null {
    const bitpix = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.BITPIX
    );

    if (bitpix === null) {
      return null;
    }

    ParsePayload.assertSupportedBITPIX(bitpix);

    const naxis1 = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS1
    );

    const naxis2 = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS2
    );

    if (naxis1 === null || naxis2 === null) {
      return null;
    }

    const dataMinItem =
      header.findById(FITSHeaderManager.DATAMIN);

    const dataMaxItem =
      header.findById(FITSHeaderManager.DATAMAX);

    if (dataMinItem === null || dataMaxItem === null) {
      const [min, max] =
        ParsePayload.computePhysicalValues(
          payload,
          header
        );

      if (dataMinItem === null && min !== null) {
        header.insert(
          new FITSHeaderItem(
            FITSHeaderManager.DATAMIN,
            min,
            "computed by jsfitsio"
          )
        );
      }

      if (dataMaxItem === null && max !== null) {
        header.insert(
          new FITSHeaderItem(
            FITSHeaderManager.DATAMAX,
            max,
            "computed by jsfitsio"
          )
        );
      }
    }

    header.insert(
      new FITSHeaderItem("END", "", "")
    );

    return header;
  }



  static computePhysicalValues(
    rawData: Uint8Array,
    header: FITSHeaderManager
  ): [number | null, number | null] {
    const bitpix = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.BITPIX
    );

    if (bitpix === null) {
      return [null, null];
    }

    ParsePayload.assertSupportedBITPIX(bitpix);

    const naxis1 = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS1
    );

    const naxis2 = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.NAXIS2
    );

    if (naxis1 === null || naxis2 === null) {
      return [null, null];
    }

    const blank = ParseHeader.getFITSItemValue(
      header,
      FITSHeaderManager.BLANK
    );

    const bzero =
      ParseHeader.getFITSItemValue(
        header,
        FITSHeaderManager.BZERO
      ) ?? 0;

    const bscale =
      ParseHeader.getFITSItemValue(
        header,
        FITSHeaderManager.BSCALE
      ) ?? 1;

    const bytesPerElement = Math.abs(bitpix) / 8;
    const pixelCount = naxis1 * naxis2;

    const requiredBytes =
      pixelCount * bytesPerElement;

    if (rawData.byteLength < requiredBytes) {
      throw new Error(
        `FITS payload is too short: expected ${requiredBytes} bytes, ` +
        `received ${rawData.byteLength}.`
      );
    }

    const view = new DataView(
      rawData.buffer,
      rawData.byteOffset,
      rawData.byteLength
    );

    let min: number | null = null;
    let max: number | null = null;

    for (let i = 0; i < pixelCount; i++) {
      const rawValue =
        ParsePayload.extractPixelFromView(
          view,
          i * bytesPerElement,
          bitpix
        );

      // BLANK applies to integer FITS image data.
      if (
        bitpix > 0 &&
        blank !== null &&
        rawValue === blank
      ) {
        continue;
      }

      const physicalValue =
        ParsePayload.pixel2physicalValue(
          rawValue,
          bscale,
          bzero
        );

      // Floating-point FITS images may contain NaN.
      if (Number.isNaN(physicalValue)) {
        continue;
      }

      if (min === null || physicalValue < min) {
        min = physicalValue;
      }

      if (max === null || physicalValue > max) {
        max = physicalValue;
      }
    }

    return [min, max];
  }

  static pixel2physicalValue(pxval: number, BSCALE: number, BZERO: number): number {
    if (BZERO === null || BSCALE === null) {
      throw new Error("Either BZERO or BSCALE is null");
    }
    return BZERO + BSCALE * pxval;

  }

  static extractPixelValue(
    rawData: Uint8Array,
    offset: number,
    bitpix: number
  ): number {
    ParsePayload.assertSupportedBITPIX(bitpix);

    const view = new DataView(
      rawData.buffer,
      rawData.byteOffset,
      rawData.byteLength
    );

    return ParsePayload.extractPixelFromView(
      view,
      offset,
      bitpix
    );
  }

}
