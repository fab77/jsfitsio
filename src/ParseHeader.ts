// import { FITSHeader } from "./model/FITSHeader.js";
import { FITSHeaderItem } from "./model/FITSHeaderItem.js";
import { FITSHeaderManager } from "./model/FITSHeaderManager.js";
/**
 * Summary. (bla bla bla)
 *
 * Description. (bla bla bla)
 *
 * @link   github https://github.com/fab77/FITSParser
 * @author Fabrizio Giordano <fabriziogiordano77@gmail.com>
 */

export class ParseHeader {

  static readonly CARD_SIZE = 80;
  static readonly BLOCK_SIZE = 2880;


  static getFITSItemValue(
    header: FITSHeaderManager, 
    key: string
  ): number | null {
    const item = header.findById(key)
  
    if (!item) {
      return null;
    }

    const value = Number(item.value);
    return Number.isNaN(value) ? null : value;
  }

  /**
   * Returns the complete FITS header size, including padding
   * up to the next 2880-byte boundary.
   */
  static getHeaderByteLength(
    rawData: Uint8Array,
    startOffset = 0
  ): number {
    const decoder = new TextDecoder("ascii");

    for (
      let offset = startOffset;
      offset + ParseHeader.CARD_SIZE <= rawData.byteLength;
      offset += ParseHeader.CARD_SIZE
    ) {
      const key = decoder
        .decode(rawData.subarray(offset, offset + 8))
        .trim();

      if (key === "END") {
        const consumed =
          offset + ParseHeader.CARD_SIZE - startOffset;

        return (
          Math.ceil(consumed / ParseHeader.BLOCK_SIZE) *
          ParseHeader.BLOCK_SIZE
        );
      }
    }

    throw new Error("Invalid FITS header: END card not found.");
  }
  
  static parse(
    rawData: Uint8Array,
    startOffset = 0
  ): FITSHeaderManager {
    const decoder = new TextDecoder("ascii");
    const headerLength =
      ParseHeader.getHeaderByteLength(rawData, startOffset);

    const header = new FITSHeaderManager();

    for (
      let offset = startOffset;
      offset < startOffset + headerLength;
      offset += ParseHeader.CARD_SIZE
    ) {
      const line = decoder.decode(
        rawData.subarray(offset, offset + ParseHeader.CARD_SIZE)
      );

      const key = line.slice(0, 8).trim();

      if (key === "END") {
        break;
      }

      if (!key) {
        continue;
      }

      let value: string | number;
      let comment = "";

      const rawValue = line
        .slice(10)
        .trim()
        .split("/")[0]
        .trim();

      if (Number.isNaN(Number(rawValue))) {
        value = rawValue;
      } else {
        value = Number(rawValue);
      }

      if (line.includes("/")) {
        comment =
          line.slice(10).trim().split("/")[1]?.trim() ?? "";
      }

      header.insert(
        new FITSHeaderItem(key, value, comment)
      );
    }

    return header;
  }

}
