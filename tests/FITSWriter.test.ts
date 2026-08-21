import { afterEach, describe, expect, test } from "@jest/globals";

import { FITSParser } from "../src/FITSParser";
import { FITSWriter } from "../src/FITSWriter";

import {
  createSyntheticImageHDU,
  createSyntheticMultiHDUFits,
  createSyntheticBinaryTableHDU,
  createSyntheticAsciiTableHDU,
} from "./helpers/synthetic-fits";

import {
  cleanupTemporaryFits,
  writeTemporaryFits,
} from "./helpers/temporary-fits";

import {
  createBinaryTableRow,
  createAsciiTableRow,
} from "./helpers/table-rows";

import { ImageHDU } from "../src/model/ImageHDU";
import { BinaryTableHDU } from "../src/model/BinaryTableHDU";
import { AsciiTableHDU } from "../src/model/AsciiTableHDU";

afterEach(cleanupTemporaryFits);

describe("FITSWriter round-trip", () => {
  test("writes and reads a PrimaryHDU image", async () => {
    const original = createSyntheticImageHDU({
      primary: true,
      bitpix: 16,
      shape: [2, 2],
      pixels: [1, 2, 3, 4],
    });
    const inputPath = await writeTemporaryFits(original);
    const file = await FITSParser.loadFITSFile(inputPath);
    expect(file).not.toBeNull();
    if (!file) {
      throw new Error("FITS file unexpectedly null");
    }
    const serialized = FITSWriter.createFITSFile(file);
    const outputPath = await writeTemporaryFits(serialized);
    const reparsed = await FITSParser.loadFITSFile(outputPath);
    expect(reparsed).not.toBeNull();
    const primary = reparsed?.primaryHDU;
    expect(primary?.shape).toEqual([2, 2]);
    expect(primary?.typedData).toBeInstanceOf(Int16Array);
    expect(Array.from(primary?.typedData as Int16Array)).toEqual([1, 2, 3, 4]);
  });

  test("writes and reads a BINTABLE HDU", async () => {
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
    const original = createSyntheticMultiHDUFits([primary, table]);
    const inputPath = await writeTemporaryFits(original);
    const file = await FITSParser.loadFITSFile(inputPath);
    if (!file) {
      throw new Error("FITS file unexpectedly null");
    }
    const serialized = FITSWriter.createFITSFile(file);
    const outputPath = await writeTemporaryFits(serialized);
    const reparsed = await FITSParser.loadFITSFile(outputPath);
    const hdu = reparsed?.getHDU(1);
    expect(hdu).toBeInstanceOf(BinaryTableHDU);
    if (!(hdu instanceof BinaryTableHDU)) {
      throw new Error("Expected BinaryTableHDU");
    }
    expect(hdu.getRow(0)).toEqual([1, 1.5]);
    expect(hdu.getRow(1)).toEqual([2, 3.25]);
  });

  test("writes and reads an ASCII TABLE HDU", async () => {
    const primary = createSyntheticImageHDU({
      primary: true,
      shape: [],
      pixels: [],
    });
    const row1 = createAsciiTableRow(1, "STAR-A", 12.5);
    const row2 = createAsciiTableRow(2, "STAR-B", 3.25);
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
    const original = createSyntheticMultiHDUFits([primary, table]);
    const inputPath = await writeTemporaryFits(original);
    const file = await FITSParser.loadFITSFile(inputPath);
    if (!file) {
      throw new Error("FITS file unexpectedly null");
    }
    const serialized = FITSWriter.createFITSFile(file);
    const outputPath = await writeTemporaryFits(serialized);
    const reparsed = await FITSParser.loadFITSFile(outputPath);
    const hdu = reparsed?.getHDU(1);
    expect(hdu).toBeInstanceOf(AsciiTableHDU);
    if (!(hdu instanceof AsciiTableHDU)) {
      throw new Error("Expected AsciiTableHDU");
    }
    expect(hdu.getRow(0)).toEqual([1, "STAR-A", 12.5]);
    expect(hdu.getRow(1)).toEqual([2, "STAR-B", 3.25]);
  });

  test("writes and reads an ImageHDU extension", async () => {
    const primary = createSyntheticImageHDU({
      primary: true,
      bitpix: 16,
      shape: [2],
      pixels: [10, 20],
    });
    const extension = createSyntheticImageHDU({
      primary: false,
      bitpix: -32,
      shape: [2, 2],
      pixels: [1.5, 2.5, 3.5, 4.5],
    });
    const original = createSyntheticMultiHDUFits([primary, extension]);
    const inputPath = await writeTemporaryFits(original);
    const file = await FITSParser.loadFITSFile(inputPath);
    if (!file) {
      throw new Error("FITS file unexpectedly null");
    }
    const serialized = FITSWriter.createFITSFile(file);
    const outputPath = await writeTemporaryFits(serialized);
    const reparsed = await FITSParser.loadFITSFile(outputPath);
    expect(reparsed?.length).toBe(2);
    const hdu = reparsed?.getHDU(1);
    expect(hdu).toBeInstanceOf(ImageHDU);
    if (!(hdu instanceof ImageHDU)) {
      throw new Error("Expected second HDU to be an ImageHDU");
    }
    expect(hdu.type).toBe("IMAGE");
    expect(hdu.bitpix).toBe(-32);
    expect(hdu.shape).toEqual([2, 2]);
    expect(hdu.typedData).toBeInstanceOf(Float32Array);
    expect(Array.from(hdu.typedData as Float32Array)).toEqual([
      1.5, 2.5, 3.5, 4.5,
    ]);
  });
});
