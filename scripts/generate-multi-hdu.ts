import { writeFile } from "node:fs/promises";

import {
  createSyntheticImageHDU,
  createSyntheticMultiHDUFits,
} from "../tests/helpers/synthetic-fits";

const primary = createSyntheticImageHDU({
  primary: true,
  bitpix: 16,
  shape: [2, 2],
  pixels: [1, 2, 3, 4],
});

const image1 = createSyntheticImageHDU({
  primary: false,
  bitpix: -32,
  shape: [3, 2],
  pixels: [
    1.5, 2.5, 3.5,
    4.5, 5.5, 6.5,
  ],
});

const image2 = createSyntheticImageHDU({
  primary: false,
  bitpix: 8,
  shape: [4, 1],
  pixels: [10, 20, 30, 40],
});

const fits = createSyntheticMultiHDUFits([
  primary,
  image1,
  image2,
]);

await writeFile(
  "./examples-test/multi-hdu.fits",
  fits,
);

console.log(
  "Generated examples-test/multi-hdu.fits",
);