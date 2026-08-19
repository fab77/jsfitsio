import { ImageHDU } from "./ImageHDU.js";
import { FITSHDUType } from "./FITSHDU.js";
import { FITSHeaderManager } from "./FITSHeaderManager.js";

export class PrimaryHDU extends ImageHDU {
  readonly type: FITSHDUType = "PRIMARY";

  constructor(
    header: FITSHeaderManager,
    rawData: Uint8Array | null,
    dataOffset: number,
    dataByteLength: number,
  ) {
    super(
      header,
      rawData,
      dataOffset,
      dataByteLength,
    );
  }
}