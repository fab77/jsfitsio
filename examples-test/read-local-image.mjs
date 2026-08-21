import { FITSParser } from "jsfitsio";

const fitsPath = new URL("./Npix43348.fits", import.meta.url);

const fitsFile = await FITSParser.loadFITSFile(fitsPath.pathname)

if (!fitsFile?.primaryHDU) {
  throw new Error("Primary HDU not found");
}
const image = fitsFile.primaryHDU;
console.log("BITPIX:", image.bitpix);
console.log("Shape:", image.shape);
console.log("Dimensions:", image.naxis);
console.log("Number of elements:", image.elementCount);