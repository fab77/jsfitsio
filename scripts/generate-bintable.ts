import { writeFile } from "node:fs/promises";

import {
  createSyntheticBinaryTableHDU,
  createSyntheticImageHDU,
  createSyntheticMultiHDUFits,
} from "../tests/helpers/synthetic-fits";

function createBinaryTableRow(
  id: number,
  flux: number,
): Uint8Array {
  const buffer =
    new ArrayBuffer(8);

  const view =
    new DataView(buffer);

  /*
   * FITS binary table values are big-endian.
   *
   * 1J = 32-bit signed integer
   * 1E = 32-bit IEEE floating point
   */
  view.setInt32(
    0,
    id,
    false,
  );

  view.setFloat32(
    4,
    flux,
    false,
  );

  return new Uint8Array(
    buffer,
  );
}

const primary =
  createSyntheticImageHDU({
    primary: true,
    shape: [],
    pixels: [],
  });

const table =
  createSyntheticBinaryTableHDU({
    columns: [
      {
        name: "ID",
        format: "1J",
      },
      {
        name: "FLUX",
        format: "1E",
      },
    ],

    rows: [
      createBinaryTableRow(
        1,
        1.5,
      ),
      createBinaryTableRow(
        2,
        3.25,
      ),
      createBinaryTableRow(
        3,
        7.75,
      ),
    ],
  });

const fits =
  createSyntheticMultiHDUFits([
    primary,
    table,
  ]);

const outputPath =
  "./examples-test/bintable.fits";

await writeFile(
  outputPath,
  fits,
);

console.log(
  `Generated ${outputPath}`,
);