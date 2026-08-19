import { FITSHeaderManager } from "./FITSHeaderManager.js";

/**
 * @deprecated Legacy 2D FITS representation.
 *
 * Use FITSFile and its HDUs instead.
 */
export interface FITSParsed {
  header: FITSHeaderManager;
  data: Array<Uint8Array>;
}
