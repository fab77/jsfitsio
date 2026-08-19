import { FITSHDU, FITSHDUType } from "./FITSHDU.js";

import { FITSHeaderManager } from "./FITSHeaderManager.js";

import type { FITSAsciiTableColumn } from "./FITSAsciiTableColumn.js";

export class AsciiTableHDU extends FITSHDU {
  readonly type = "TABLE" as const;

  constructor(
    header: FITSHeaderManager,
    rawData: Uint8Array,
    dataOffset: number,
    dataByteLength: number,

    public readonly rowByteLength: number,
    public readonly rowCount: number,

    public readonly columns: readonly FITSAsciiTableColumn[],
  ) {
    super(header, rawData, dataOffset, dataByteLength);
  }

  get columnCount(): number {
    return this.columns.length;
  }

  getRowView(rowIndex: number): Uint8Array {
    if (
      !Number.isInteger(rowIndex) ||
      rowIndex < 0 ||
      rowIndex >= this.rowCount
    ) {
      throw new RangeError(`Invalid row index ${rowIndex}.`);
    }

    const start = rowIndex * this.rowByteLength;

    return this.rawData!.subarray(start, start + this.rowByteLength);
  }

  getRowText(rowIndex: number): string {
    return new TextDecoder("ascii").decode(this.getRowView(rowIndex));
  }
}
