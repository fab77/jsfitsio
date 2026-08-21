import { FITSParser } from "jsfitsio";

const fitsPath = new URL("./Npix43348.fits", import.meta.url);

const fitsFile = await FITSParser.loadFITSFile(fitsPath.pathname);

if (!fitsFile) {
  throw new Error("Unable to load FITS file");
}
console.log("Number of HDUs:", fitsFile.length);
console.log("Primary HDU:", fitsFile.primaryHDU);
