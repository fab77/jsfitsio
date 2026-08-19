import { FITSHDU } from "./FITSHDU.js";
import { PrimaryHDU } from "./PrimaryHDU.js";

export class FITSFile {
  private readonly _hdus: FITSHDU[];

  constructor(hdus: FITSHDU[] = []) {
    this._hdus = [...hdus];
  }

  get hdus(): readonly FITSHDU[] {
    return this._hdus;
  }

  get length(): number {
    return this._hdus.length;
  }

  get primaryHDU(): PrimaryHDU | null {
    const hdu = this._hdus[0];

    if (hdu instanceof PrimaryHDU) {
      return hdu;
    }

    return null;
  }

  getHDU(index: number): FITSHDU | null {
    return this._hdus[index] ?? null;
  }

  addHDU(hdu: FITSHDU): void {
    this._hdus.push(hdu);
  }
}