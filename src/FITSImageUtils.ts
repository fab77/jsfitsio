import { FITSHeaderManager } from "./model/FITSHeaderManager.js";
import { ParseHeader } from "./ParseHeader.js";

export class FITSImageUtils {
  static getShape(header: FITSHeaderManager): number[] {
    const naxis = ParseHeader.getFITSItemValue(header, FITSHeaderManager.NAXIS);

    if (naxis === null) {
      throw new Error("NAXIS not defined.");
    }

    if (!Number.isInteger(naxis) || naxis < 0) {
      throw new Error(`Invalid FITS NAXIS value: ${naxis}`);
    }

    const shape: number[] = [];

    for (let axis = 1; axis <= naxis; axis++) {
      const size = ParseHeader.getFITSItemValue(
        header,
        FITSHeaderManager.naxisKey(axis),
      );

      if (size === null) {
        throw new Error(`NAXIS${axis} not defined.`);
      }

      shape.push(size);
    }

    return shape;
  }

  static getElementCount(shape: readonly number[]): number {
    if (shape.length === 0) {
      return 0;
    }

    return shape.reduce((total, dimension) => total * dimension, 1);
  }
}
