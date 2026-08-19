import { FITSHDU, FITSHDUType } from "./FITSHDU.js";

import { FITSHeaderManager } from "./FITSHeaderManager.js";

import type { FITSBinaryTableColumn } from "./FITSBinaryTableColumn.js";

export class BinaryTableHDU extends FITSHDU {
  readonly type: FITSHDUType = "BINTABLE";

  constructor(
    header: FITSHeaderManager,
    rawData: Uint8Array,
    dataOffset: number,
    dataByteLength: number,

    public readonly rowByteLength: number,
    public readonly rowCount: number,

    public readonly columns: readonly FITSBinaryTableColumn[],
  ) {
    super(header, rawData, dataOffset, dataByteLength);
  }

  get columnCount(): number {
    return this.columns.length;
  }

  getRowView(rowIndex: number): DataView {
    if (rowIndex < 0 || rowIndex >= this.rowCount) {
      throw new RangeError(`Invalid row index ${rowIndex}.`);
    }

    const offset = rowIndex * this.rowByteLength;

    return new DataView(
      this.rawData!.buffer,
      this.rawData!.byteOffset + offset,
      this.rowByteLength,
    );
  }
}
