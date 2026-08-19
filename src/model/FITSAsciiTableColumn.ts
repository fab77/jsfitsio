export type FITSAsciiTableColumnType =
  | "CHAR"
  | "INTEGER"
  | "FLOAT"
  | "EXPONENTIAL"
  | "DOUBLE"
  | "UNKNOWN";

export interface FITSAsciiTableColumn {
  /**
   * FITS columns are numbered from 1.
   */
  index: number;

  name: string | null;

  format: string;

  type: FITSAsciiTableColumnType;

  /**
   * TBCOLn value from FITS.
   * This is 1-based.
   */
  startColumn: number;

  /**
   * Zero-based byte offset within a table row.
   */
  byteOffset: number;

  /**
   * Width of the ASCII field in bytes/characters.
   */
  width: number;

  decimals: number | null;

  unit: string | null;
}