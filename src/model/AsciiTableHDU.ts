import { FITSHDU, FITSHDUType } from "./FITSHDU.js";

import { FITSHeaderManager } from "./FITSHeaderManager.js";

import type { FITSAsciiTableColumn } from "./FITSAsciiTableColumn.js";
import { FITSTableCellValue } from "./FITSTableData.js";

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

  private resolveColumn(column: number | string): FITSAsciiTableColumn {
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
      throw new Error(`ASCII TABLE column '${column}' not found.`);
    }

    return found;
  }

  getCell(rowIndex: number, column: number | string): FITSTableCellValue {
    const definition = this.resolveColumn(column);

    const row = this.getRowView(rowIndex);

    const bytes = row.subarray(
      definition.byteOffset,
      definition.byteOffset + definition.width,
    );

    const raw = new TextDecoder("ascii").decode(bytes);

    const trimmed = raw.trim();

    /*
     * Blank numeric fields are treated as null.
     */
    if (trimmed.length === 0) {
      return definition.type === "CHAR" ? "" : null;
    }

    switch (definition.type) {
      case "CHAR":
        return raw.replace(/\s+$/, "");

      case "INTEGER": {
        const value = Number.parseInt(trimmed, 10);

        if (Number.isNaN(value)) {
          return null;
        }

        return value;
      }

      case "FLOAT":
      case "EXPONENTIAL":
      case "DOUBLE": {
        /*
         * FITS ASCII tables may use D exponent notation.
         * JavaScript expects E.
         */
        const normalized = trimmed.replace(/[dD]/, "E");

        const value = Number.parseFloat(normalized);

        if (Number.isNaN(value)) {
          return null;
        }

        return value;
      }

      default:
        throw new Error(
          `Unsupported ASCII TABLE column type: ${definition.type}`,
        );
    }
  }

  getRow(rowIndex: number): FITSTableCellValue[] {
    return this.columns.map((_, columnIndex) =>
      this.getCell(rowIndex, columnIndex),
    );
  }
}
