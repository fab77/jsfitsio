import { fileURLToPath } from "node:url";

import { FITSParser } from "jsfitsio";

const fitsPath = fileURLToPath(
  new URL("./multi-hdu.fits", import.meta.url),
);

const fitsFile = await FITSParser.loadFITSFile(fitsPath);

if (!fitsFile) {
  throw new Error("Unable to load FITS file");
}

console.log("Number of HDUs:", fitsFile.length);

for (let i = 0; i < fitsFile.length; i++) {
  const hdu = fitsFile.getHDU(i);

  console.log(
    `HDU ${i}:`,
    hdu?.type,
  );
}