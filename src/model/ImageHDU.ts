import {
  FITSHDU,
  FITSHDUType,
} from "./FITSHDU.js";

import { FITSHeaderManager } from "./FITSHeaderManager.js";

import type {
  FITSImageTypedArray,
} from "./FITSImageData.js";

export class ImageHDU extends FITSHDU {
  readonly type: FITSHDUType = "IMAGE";

  constructor(
    header: FITSHeaderManager,
    rawData: Uint8Array | null,
    dataOffset: number,
    dataByteLength: number,

    public readonly bitpix: number,
    public readonly shape: readonly number[],
    public readonly typedData: FITSImageTypedArray | null,
  ) {
    super(
      header,
      rawData,
      dataOffset,
      dataByteLength,
    );
  }

  get naxis(): number {
    return this.shape.length;
  }

  get elementCount(): number {
    if (this.shape.length === 0) {
      return 0;
    }

    return this.shape.reduce(
      (accumulator, dimension) =>
        accumulator * dimension,
      1,
    );
  }
}