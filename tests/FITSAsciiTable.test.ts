import { afterEach, describe, expect, test } from "@jest/globals";
import { FITSParser } from "../src/FITSParser";

import {
  createSyntheticAsciiTableHDU,
  createSyntheticImageHDU,
  createSyntheticMultiHDUFits,
} from "./helpers/synthetic-fits";

import {
  cleanupTemporaryFits,
  writeTemporaryFits,
} from "./helpers/temporary-fits";

import { createAsciiTableRow } from "./helpers/table-rows";

import { AsciiTableHDU } from "../src/model/AsciiTableHDU";

afterEach(cleanupTemporaryFits);

async function loadSyntheticAsciiTable(): Promise<AsciiTableHDU> {
  const primary = createSyntheticImageHDU({
    primary: true,
    shape: [],
    pixels: [],
  });

  const row1 = createAsciiTableRow(1, "STAR-A", 12.5);

  const row2 = createAsciiTableRow(2, "STAR-B", 3.25);

  expect(row1).toHaveLength(20);
  expect(row2).toHaveLength(20);

  const table = createSyntheticAsciiTableHDU({
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

    rows: [row1, row2],
  });

  const fits = createSyntheticMultiHDUFits([primary, table]);

  const path = await writeTemporaryFits(fits);

  const file = await FITSParser.loadFITSFile(path);

  if (!file) {
    throw new Error("FITS file unexpectedly null");
  }

  const hdu = file.getHDU(1);

  if (!(hdu instanceof AsciiTableHDU)) {
    throw new Error("Expected second HDU to be an AsciiTableHDU");
  }

  return hdu;
}

describe("AsciiTableHDU parsing", () => {
  test("parses ASCII TABLE metadata", async () => {
    const hdu = await loadSyntheticAsciiTable();

    expect(hdu.type).toBe("TABLE");

    expect(hdu.rowCount).toBe(2);

    expect(hdu.rowByteLength).toBe(20);

    expect(hdu.columnCount).toBe(3);

    expect(hdu.dataByteLength).toBe(40);

    expect(hdu.columns[0]).toMatchObject({
      name: "ID",
      format: "I4",
      type: "INTEGER",
      startColumn: 1,
      byteOffset: 0,
      width: 4,
      decimals: null,
    });

    expect(hdu.columns[1]).toMatchObject({
      name: "NAME",
      format: "A8",
      type: "CHAR",
      startColumn: 6,
      byteOffset: 5,
      width: 8,
      decimals: null,
    });

    expect(hdu.columns[2]).toMatchObject({
      name: "FLUX",
      format: "F7.2",
      type: "FLOAT",
      startColumn: 14,
      byteOffset: 13,
      width: 7,
      decimals: 2,
      unit: "Jy",
    });
  });

  test("reads raw row text", async () => {
    const hdu = await loadSyntheticAsciiTable();

    const row1 = createAsciiTableRow(1, "STAR-A", 12.5);

    const row2 = createAsciiTableRow(2, "STAR-B", 3.25);

    expect(hdu.getRowText(0)).toBe(row1);

    expect(hdu.getRowText(1)).toBe(row2);
  });
});

describe("AsciiTableHDU data access", () => {
  test("reads cells by name and index", async () => {
    const hdu = await loadSyntheticAsciiTable();

    expect(hdu.getCell(0, "ID")).toBe(1);

    expect(hdu.getCell(0, "NAME")).toBe("STAR-A");

    expect(hdu.getCell(0, "FLUX")).toBeCloseTo(12.5);

    expect(hdu.getCell(1, "ID")).toBe(2);

    expect(hdu.getCell(1, "NAME")).toBe("STAR-B");

    expect(hdu.getCell(1, "FLUX")).toBeCloseTo(3.25);

    expect(hdu.getCell(0, 0)).toBe(1);

    expect(hdu.getCell(0, 1)).toBe("STAR-A");

    expect(hdu.getCell(0, 2)).toBeCloseTo(12.5);
  });

  test("reads complete rows", async () => {
    const hdu = await loadSyntheticAsciiTable();

    expect(hdu.getRow(0)).toEqual([1, "STAR-A", 12.5]);

    expect(hdu.getRow(1)).toEqual([2, "STAR-B", 3.25]);
  });

  test("rejects invalid row and column access", async () => {
    const hdu = await loadSyntheticAsciiTable();

    expect(() => hdu.getRow(-1)).toThrow(RangeError);

    expect(() => hdu.getRow(2)).toThrow(RangeError);

    expect(() => hdu.getCell(-1, "ID")).toThrow(RangeError);

    expect(() => hdu.getCell(2, "ID")).toThrow(RangeError);

    expect(() => hdu.getCell(0, 99)).toThrow(RangeError);

    expect(() => hdu.getCell(0, "UNKNOWN")).toThrow();
  });
});
