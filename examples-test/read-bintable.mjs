import { fileURLToPath } from "node:url";

import {
  FITSParser,
  BinaryTableHDU,
} from "jsfitsio";

const fitsPath = fileURLToPath(
  new URL("./bintable.fits", import.meta.url),
);

const fitsFile = await FITSParser.loadFITSFile(fitsPath);

if (!fitsFile) {
  throw new Error("Unable to load FITS file");
}

console.log("Number of HDUs:", fitsFile.length);

const hdu = fitsFile.getHDU(1);

if (!(hdu instanceof BinaryTableHDU)) {
  throw new Error("Expected a BINTABLE extension");
}

console.log("HDU type:", hdu.type);
console.log("Rows:", hdu.rowCount);
console.log("Columns:", hdu.columnCount);

console.log(
  "Column names:",
  hdu.columns.map((column) => column.name),
);

console.log("Row 0:", hdu.getRow(0));
console.log("Row 1:", hdu.getRow(1));

console.log("ID[0]:", hdu.getCell(0, "ID"));
console.log("FLUX[0]:", hdu.getCell(0, "FLUX"));

console.log("ID[1]:", hdu.getCell(1, 0));
console.log("FLUX[1]:", hdu.getCell(1, 1));