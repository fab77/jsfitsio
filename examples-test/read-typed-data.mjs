import { fileURLToPath } from "node:url";

import { FITSParser } from "../lib-esm/index.mjs";

const fitsPath = fileURLToPath(new URL("./Npix43348.fits", import.meta.url));

const fitsFile = await FITSParser.loadFITSFile(fitsPath);

if (!fitsFile?.primaryHDU) {
  throw new Error("Unable to load FITS image");
}

const image = fitsFile.primaryHDU;
const data = image.typedData;

if (!data) {
  throw new Error("FITS image does not contain image data");
}

console.log("BITPIX:", image.bitpix);
console.log("Shape:", image.shape);
console.log("Elements:", image.elementCount);

console.log("TypedArray:", data.constructor.name);

console.log("First 10 values:", data.slice(0, 10));

/*
 * Example of type-specific access.
 */
if (data instanceof Uint8Array) {
  console.log("First Uint8 value:", data[0]);
}
if (data instanceof Int16Array) {
  console.log("First Int16 value:", data[0]);
}
if (data instanceof Int32Array) {
  console.log("First Int32 value:", data[0]);
}

if (data instanceof Float32Array) {
  console.log("First Float32 value:", data[0]);
}

if (data instanceof Float64Array) {
  console.log("First Float64 value:", data[0]);
}

if (data instanceof BigInt64Array) {
  console.log("First 64-bit integer:", data[0]);
}
