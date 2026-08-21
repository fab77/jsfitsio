import { afterEach, describe, expect, test } from "@jest/globals";
import { FITSParser } from "../src/FITSParser";
import {
  createSyntheticBinaryTableHDU,
  createSyntheticImageHDU,
  createSyntheticMultiHDUFits,
} from "./helpers/synthetic-fits";

import {
  cleanupTemporaryFits,
  writeTemporaryFits,
} from "./helpers/temporary-fits";
import { createBinaryTableRow } from "./helpers/table-rows";
import { BinaryTableHDU } from "../src/model/BinaryTableHDU";

afterEach(cleanupTemporaryFits);

async function loadSyntheticBinaryTable(): Promise<BinaryTableHDU> {
  const primary = createSyntheticImageHDU({
    primary: true,
    shape: [],
    pixels: [],
  });

  const table = createSyntheticBinaryTableHDU({
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

    rows: [createBinaryTableRow(1, 1.5), createBinaryTableRow(2, 3.25)],
  });

  const fits = createSyntheticMultiHDUFits([primary, table]);

  const path = await writeTemporaryFits(fits);

  const file = await FITSParser.loadFITSFile(path);

  if (!file) {
    throw new Error("FITS file unexpectedly null");
  }

  const hdu = file.getHDU(1);

  if (!(hdu instanceof BinaryTableHDU)) {
    throw new Error("Expected second HDU to be a BinaryTableHDU");
  }

  return hdu;
}

describe("BinaryTableHDU parsing", () => {
  test("parses BINTABLE metadata", async () => {
    const hdu = await loadSyntheticBinaryTable();

    expect(hdu.type).toBe("BINTABLE");

    expect(hdu.rowCount).toBe(2);

    expect(hdu.rowByteLength).toBe(8);

    expect(hdu.columnCount).toBe(2);

    expect(hdu.columns[0].name).toBe("ID");

    expect(hdu.columns[0].format).toBe("1J");

    expect(hdu.columns[0].type).toBe("INT32");

    expect(hdu.columns[0].byteOffset).toBe(0);

    expect(hdu.columns[0].byteWidth).toBe(4);

    expect(hdu.columns[1].name).toBe("FLUX");

    expect(hdu.columns[1].format).toBe("1E");

    expect(hdu.columns[1].type).toBe("FLOAT32");

    expect(hdu.columns[1].byteOffset).toBe(4);

    expect(hdu.columns[1].byteWidth).toBe(4);

    expect(hdu.dataByteLength).toBe(16);
  });
});

describe("BinaryTableHDU data access", () => {
  test("reads cells by name and index", async () => {
    const hdu = await loadSyntheticBinaryTable();

    expect(hdu.getCell(0, "ID")).toBe(1);

    expect(hdu.getCell(0, "FLUX")).toBeCloseTo(1.5);

    expect(hdu.getCell(1, "ID")).toBe(2);

    expect(hdu.getCell(1, "FLUX")).toBeCloseTo(3.25);

    expect(hdu.getCell(0, 0)).toBe(1);

    expect(hdu.getCell(0, 1)).toBeCloseTo(1.5);
  });

  test("reads complete rows", async () => {
    const hdu = await loadSyntheticBinaryTable();

    expect(hdu.getRow(0)).toEqual([1, 1.5]);

    expect(hdu.getRow(1)).toEqual([2, 3.25]);
  });

  test("rejects invalid row and column access", async () => {
    const hdu = await loadSyntheticBinaryTable();

    expect(() => hdu.getRow(-1)).toThrow(RangeError);

    expect(() => hdu.getRow(2)).toThrow(RangeError);

    expect(() => hdu.getCell(-1, "ID")).toThrow(RangeError);

    expect(() => hdu.getCell(2, "ID")).toThrow(RangeError);

    expect(() => hdu.getCell(0, 99)).toThrow(RangeError);

    expect(() => hdu.getCell(0, "UNKNOWN")).toThrow();
  });
});
