import { FITSHDU, FITSHDUType } from "./FITSHDU.js";

import { FITSHeaderManager } from "./FITSHeaderManager.js";

import type { FITSBinaryTableColumn } from "./FITSBinaryTableColumn.js";

import type { FITSTableCellValue, FITSComplex } from "./FITSTableData.js";

export class BinaryTableHDU extends FITSHDU {
  readonly type = "BINTABLE" as const;

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

  getRow(rowIndex: number): FITSTableCellValue[] {
    return this.columns.map((_, columnIndex) =>
      this.getCell(rowIndex, columnIndex),
    );
  }
  
  getCell(rowIndex: number, column: number | string): FITSTableCellValue {
    const columnDefinition = this.resolveColumn(column);

    const row = this.getRowView(rowIndex);

    const offset = columnDefinition.byteOffset;

    const repeat = columnDefinition.repeat;

    switch (columnDefinition.type) {
      case "CHAR": {
        const bytes = new Uint8Array(
          row.buffer,
          row.byteOffset + offset,
          columnDefinition.byteWidth,
        );

        return new TextDecoder("ascii").decode(bytes).replace(/\s+$/, "");
      }

      case "LOGICAL": {
        const values: boolean[] = [];

        for (let i = 0; i < repeat; i++) {
          const value = String.fromCharCode(row.getUint8(offset + i));

          values.push(value === "T");
        }

        return repeat === 1 ? values[0] : values;
      }

      case "UINT8": {
        const values: number[] = [];

        for (let i = 0; i < repeat; i++) {
          const raw = row.getUint8(offset + i);

          values.push(
            this.applyNumericScaling(
              raw,
              columnDefinition.scale,
              columnDefinition.zero,
            ),
          );
        }

        return repeat === 1 ? values[0] : values;
      }

      case "INT16":
        return this.readNumericColumn(
          row,
          offset,
          repeat,
          2,
          (view, position) => view.getInt16(position, false),
          columnDefinition.scale,
          columnDefinition.zero,
          columnDefinition.nullValue,
        );

      case "INT32":
        return this.readNumericColumn(
          row,
          offset,
          repeat,
          4,
          (view, position) => view.getInt32(position, false),
          columnDefinition.scale,
          columnDefinition.zero,
          columnDefinition.nullValue,
        );

      case "INT64": {
        const values: bigint[] = [];

        for (let i = 0; i < repeat; i++) {
          const raw = row.getBigInt64(offset + i * 8, false);

          /*
           * Preserve exact 64-bit integers.
           *
           * Do not silently convert bigint to number.
           */
          values.push(raw);
        }

        return repeat === 1 ? values[0] : values;
      }

      case "FLOAT32":
        return this.readNumericColumn(
          row,
          offset,
          repeat,
          4,
          (view, position) => view.getFloat32(position, false),
          columnDefinition.scale,
          columnDefinition.zero,
          null,
        );

      case "FLOAT64":
        return this.readNumericColumn(
          row,
          offset,
          repeat,
          8,
          (view, position) => view.getFloat64(position, false),
          columnDefinition.scale,
          columnDefinition.zero,
          null,
        );

      case "COMPLEX64": {
        const values: FITSComplex[] = [];

        for (let i = 0; i < repeat; i++) {
          const position = offset + i * 8;

          values.push({
            real: row.getFloat32(position, false),

            imaginary: row.getFloat32(position + 4, false),
          });
        }

        return repeat === 1 ? values[0] : values;
      }

      case "COMPLEX128": {
        const values: FITSComplex[] = [];

        for (let i = 0; i < repeat; i++) {
          const position = offset + i * 16;

          values.push({
            real: row.getFloat64(position, false),

            imaginary: row.getFloat64(position + 8, false),
          });
        }

        return repeat === 1 ? values[0] : values;
      }

      case "BIT":
        /*
         * I'd defer bit-array decoding for the moment.
         * The raw bytes remain available.
         */
        return new Uint8Array(
          row.buffer,
          row.byteOffset + offset,
          columnDefinition.byteWidth,
        ).slice();

      default:
        throw new Error(
          `Unsupported BINTABLE column type: ${columnDefinition.type}`,
        );
    }
  }

  private readNumericColumn(
    view: DataView,
    offset: number,
    repeat: number,
    bytesPerElement: number,
    reader: (view: DataView, offset: number) => number,
    scale: number,
    zero: number,
    nullValue: number | bigint | null,
  ): FITSTableCellValue {
    const values: Array<number | null> = [];

    for (let i = 0; i < repeat; i++) {
      const raw = reader(view, offset + i * bytesPerElement);

      if (nullValue !== null && raw === nullValue) {
        values.push(null);
        continue;
      }

      values.push(this.applyNumericScaling(raw, scale, zero));
    }

    if (repeat === 1) {
      return values[0];
    }

    /*
     * Because repeated integer fields may contain NULL,
     * we cannot represent every case as number[].
     *
     * For now return a generic value array.
     */
    return values as FITSTableCellValue;
  }

  private applyNumericScaling(
    raw: number,
    scale: number,
    zero: number,
  ): number {
    return zero + scale * raw;
  }

  private resolveColumn(column: number | string): FITSBinaryTableColumn {
    if (typeof column === "number") {
      if (
        !Number.isInteger(column) ||
        column < 0 ||
        column >= this.columns.length
      ) {
        throw new RangeError(`Invalid column index ${column}.`);
      }

      return this.columns[column];
    }

    const found = this.columns.find((candidate) => candidate.name === column);

    if (!found) {
      throw new Error(`BINTABLE column '${column}' not found.`);
    }

    return found;
  }
}
