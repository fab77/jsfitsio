import { writeFile } from "node:fs/promises";

import {
  createSyntheticAsciiTableHDU,
  createSyntheticImageHDU,
  createSyntheticMultiHDUFits,
} from "../tests/helpers/synthetic-fits";

function createAsciiTableRow(
  id: number,
  name: string,
  flux: number,
): string {
  return (
    String(id).padStart(4, " ") +
    " " +
    name
      .padEnd(8, " ")
      .slice(0, 8) +
    flux
      .toFixed(2)
      .padStart(7, " ")
  );
}

const primary =
  createSyntheticImageHDU({
    primary: true,
    shape: [],
    pixels: [],
  });

const table =
  createSyntheticAsciiTableHDU({
    rowByteLength: 20,

    columns: [
      {
        name: "ID",
        format: "I4",
        startColumn: 1,
      },
      {
        name: "NAME",
        format: "A8",
        startColumn: 6,
      },
      {
        name: "FLUX",
        format: "F7.2",
        startColumn: 14,
        unit: "Jy",
      },
    ],

    rows: [
      createAsciiTableRow(
        1,
        "STAR-A",
        12.5,
      ),
      createAsciiTableRow(
        2,
        "STAR-B",
        3.25,
      ),
      createAsciiTableRow(
        3,
        "STAR-C",
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
  "./examples-test/ascii-table.fits";

await writeFile(
  outputPath,
  fits,
);

console.log(
  `Generated ${outputPath}`,
);