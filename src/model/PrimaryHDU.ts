import { ImageHDU } from "./ImageHDU.js";
import { FITSHDUType } from "./FITSHDU.js";
import { FITSHeaderManager } from "./FITSHeaderManager.js";

import type {
  FITSImageTypedArray,
} from "./FITSImageData.js";

export class PrimaryHDU extends ImageHDU {
  readonly type: FITSHDUType = "PRIMARY";

  constructor(
    header: FITSHeaderManager,
    rawData: Uint8Array | null,
    dataOffset: number,
    dataByteLength: number,
    bitpix: number,
    shape: readonly number[],
    typedData: FITSImageTypedArray | null,
  ) {
    super(
      header,
      rawData,
      dataOffset,
      dataByteLength,
      bitpix,
      shape,
      typedData,
    );
  }
}