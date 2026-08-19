import { FITSHeaderManager } from "./FITSHeaderManager.js";

export type FITSHDUType =
  | "PRIMARY"
  | "IMAGE"
  | "BINTABLE"
  | "TABLE"
  | "UNKNOWN";

export abstract class FITSHDU {
  constructor(
    public readonly header: FITSHeaderManager,
    public readonly rawData: Uint8Array | null,
    public readonly dataOffset: number,
    public readonly dataByteLength: number,
  ) {}

  abstract readonly type: FITSHDUType;
}