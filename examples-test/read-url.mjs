import { FITSParser } from "../lib-esm/index.mjs";

const url =
  "http://skies.esac.esa.int/Herschel/normalized/PACS_hips160//Norder8/Dir40000/Npix47180.fits";

const fitsFile = await FITSParser.loadFITSFile(url);

if (!fitsFile?.primaryHDU) {
  throw new Error("Unable to load FITS file");
}

const image = fitsFile.primaryHDU;

console.log("BITPIX:", image.bitpix);
console.log("Shape:", image.shape);
console.log("Dimensions:", image.naxis);
console.log("Elements:", image.elementCount);
console.log("TypedArray:", image.typedData?.constructor.name);
console.log("First values:", image.typedData?.slice(0, 10));