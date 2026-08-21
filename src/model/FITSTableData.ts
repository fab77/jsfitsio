export interface FITSComplex {
  real: number;
  imaginary: number;
}

export type FITSTableCellValue =
  | string
  | boolean
  | number
  | bigint
  | FITSComplex
  | Uint8Array
  | Array<boolean | null>
  | Array<number | null>
  | Array<bigint | null>
  | Array<FITSComplex | null>
  | null;