export type FITSBinaryTableColumnType =
  | "LOGICAL"
  | "BIT"
  | "UINT8"
  | "INT16"
  | "INT32"
  | "INT64"
  | "CHAR"
  | "FLOAT32"
  | "FLOAT64"
  | "COMPLEX64"
  | "COMPLEX128"
  | "UNKNOWN";

export interface FITSBinaryTableColumn {
  index: number;

  name: string | null;
  format: string;

  type: FITSBinaryTableColumnType;

  repeat: number;

  byteOffset: number;
  byteWidth: number;

  unit: string | null;

  scale: number;
  zero: number;

  nullValue: number | bigint | null;
}
