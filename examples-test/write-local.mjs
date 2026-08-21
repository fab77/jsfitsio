import { fileURLToPath } from "node:url";

import { FITSParser, FITSWriter } from "../lib-esm/index.mjs";

const inputPath = fileURLToPath(new URL("./Npix43348.fits", import.meta.url));

const outputPath = fileURLToPath(new URL("./output.fits", import.meta.url));

const fitsFile = await FITSParser.loadFITSFile(inputPath);

if (!fitsFile) {
  throw new Error("Unable to load FITS file");
}

console.log("Loaded FITS file");
console.log("HDUs:", fitsFile.length);

FITSWriter.writeFITSFileModel(fitsFile, outputPath);

console.log("FITS file written to:");
console.log(outputPath);

const writtenFile = await FITSParser.loadFITSFile(outputPath);

if (!writtenFile) {
  throw new Error("Unable to read the generated FITS file");
}

console.log("Generated FITS successfully reloaded");

console.log("HDUs:", writtenFile.length);

if (writtenFile.primaryHDU) {
  console.log("Shape:", writtenFile.primaryHDU.shape);

  console.log("BITPIX:", writtenFile.primaryHDU.bitpix);
}
