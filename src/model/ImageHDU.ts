import {
  FITSHDU,
  FITSHDUType,
} from "./FITSHDU.js";

import { FITSHeaderManager } from "./FITSHeaderManager.js";

export class ImageHDU extends FITSHDU {
  readonly type: FITSHDUType = "IMAGE";

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