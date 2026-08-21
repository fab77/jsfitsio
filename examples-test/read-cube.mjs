import { fileURLToPath } from "node:url";

import { FITSParser } from "jsfitsio";

const fitsPath = fileURLToPath(
  new URL("./ngc6503.fits", import.meta.url),
);

const fitsFile = await FITSParser.loadFITSFile(fitsPath);

if (!fitsFile?.primaryHDU) {
  throw new Error("Unable to load FITS cube");
}

const cube = fitsFile.primaryHDU;

console.log("BITPIX:", cube.bitpix);
console.log("NAXIS:", cube.naxis);
console.log("Shape:", cube.shape);
console.log("Elements:", cube.elementCount);
console.log(
  "TypedArray:",
  cube.typedData?.constructor.name,
);

const nonDegenerateShape =
  cube.shape.filter((size) => size > 1);

console.log(
  "Non-degenerate shape:",
  nonDegenerateShape,
);
if (nonDegenerateShape.length !== 3) {
  throw new Error(
    `Expected 3 non-degenerate dimensions, got shape=[${cube.shape.join(", ")}]`,
  );
}