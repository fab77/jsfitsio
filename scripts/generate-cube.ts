import { writeFile } from "node:fs/promises";

import {
  createSyntheticCubeFits,
} from "../tests/helpers/synthetic-fits";

const outputPath =
  "./examples-test/cube-4x3x2.fits";

const fits =
  createSyntheticCubeFits({
    bitpix: 16,
    shape: [4, 3, 2],
    pixels: [
      1, 2, 3, 4,
      5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15, 16,
      17, 18, 19, 20,
      21, 22, 23, 24,
    ],
  });

await writeFile(
  outputPath,
  fits,
);

console.log(
  `Generated ${outputPath}`,
);