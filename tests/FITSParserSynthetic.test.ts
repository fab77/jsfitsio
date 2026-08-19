import { afterEach, describe, expect, test } from "@jest/globals";

import { mkdtemp, rm, writeFile } from "node:fs/promises";

import { tmpdir } from "node:os";
import { join } from "node:path";

import { FITSParser } from "../src/FITSParser";
import { FITSHeaderManager } from "../src/model/FITSHeaderManager";

import {
  createSyntheticFits,
  createSyntheticImageHDU,
  createSyntheticMultiHDUFits,
  createSyntheticBinaryTableHDU,
} from "./helpers/synthetic-fits";
import { BinaryTableHDU } from "../src/model/BinaryTableHDU";

let temporaryDirectories: string[] = [];

async function writeTemporaryFits(fits: Uint8Array): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "jsfitsio-test-"));

  temporaryDirectories.push(directory);

  const path = join(directory, "synthetic.fits");

  await writeFile(path, fits);

  return path;
}

afterEach(async () => {
  for (const directory of temporaryDirectories) {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }

  temporaryDirectories = [];
});

describe("FITSParser synthetic FITS", () => {
  test("reads payload after a two-block header", async () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      shape: [2, 1],
      headerBlocks: 2,
      pixels: [-10, 20],
    });

    const path = await writeTemporaryFits(fits);

    const parsed = await FITSParser.loadFITS(path);

    expect(parsed).not.toBeNull();

    if (!parsed) {
      throw new Error("FITS parser unexpectedly returned null");
    }

    /*
     * API compatibility:
     *
     * BITPIX=16
     * NAXIS1=2
     *
     * => one row containing four raw bytes.
     */
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0]).toHaveLength(4);

    /*
     * -10 = 0xFFF6
     * +20 = 0x0014
     *
     * FITS is big-endian.
     */
    expect(Array.from(parsed.data[0])).toEqual([0xff, 0xf6, 0x00, 0x14]);
  });

  test("computes correct DATAMIN and DATAMAX", async () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      shape: [2, 1],
      headerBlocks: 2,
      pixels: [-10, 20],
    });

    const path = await writeTemporaryFits(fits);

    const parsed = await FITSParser.loadFITS(path);

    expect(parsed).not.toBeNull();

    if (!parsed) {
      throw new Error("FITS parser unexpectedly returned null");
    }

    expect(parsed.header.findById(FITSHeaderManager.DATAMIN)?.value).toBe(-10);

    expect(parsed.header.findById(FITSHeaderManager.DATAMAX)?.value).toBe(20);
  });

  test("loads a FITS file using the new FITSFile model", async () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      shape: [2, 1],
      headerBlocks: 2,
      pixels: [-10, 20],
    });

    const path = await writeTemporaryFits(fits);

    const fitsFile = await FITSParser.loadFITSFile(path);

    expect(fitsFile).not.toBeNull();

    if (!fitsFile) {
      throw new Error("FITS file unexpectedly null");
    }

    expect(fitsFile.length).toBe(1);

    const primary = fitsFile.primaryHDU;

    expect(primary).not.toBeNull();

    if (!primary) {
      throw new Error("Primary HDU unexpectedly null");
    }

    expect(primary.type).toBe("PRIMARY");

    expect(primary.dataOffset).toBe(5760);

    expect(primary.dataByteLength).toBe(4);

    expect(Array.from(primary.rawData ?? [])).toEqual([0xff, 0xf6, 0x00, 0x14]);
  });

  test("loadFITSFile returns null when local file does not exist", async () => {
    const fitsFile = await FITSParser.loadFITSFile("./notexistent.fits");

    expect(fitsFile).toBeNull();
  });

  test("loads a 3D FITS image cube", async () => {
    const pixels = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,

      13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
    ];

    const fits = createSyntheticFits({
      bitpix: 16,

      shape: [4, 3, 2],

      pixels,
    });

    const path = await writeTemporaryFits(fits);

    const file = await FITSParser.loadFITSFile(path);

    expect(file).not.toBeNull();

    if (!file) {
      throw new Error("FITS file unexpectedly null");
    }

    const image = file.primaryHDU;

    expect(image).not.toBeNull();

    if (!image) {
      throw new Error("Primary HDU unexpectedly null");
    }

    expect(image.naxis).toBe(3);

    expect(image.shape).toEqual([4, 3, 2]);

    expect(image.elementCount).toBe(24);

    expect(image.bitpix).toBe(16);

    expect(image.dataByteLength).toBe(24 * 2);

    expect(image.typedData).toBeInstanceOf(Int16Array);

    expect(Array.from(image.typedData as Int16Array)).toEqual(pixels);
  });

  test("loads a Float32 FITS cube", async () => {
    const pixels = [-1.5, 0, 1.25, 2.5, 3.75, 5, 6.25, 7.5];

    const fits = createSyntheticFits({
      bitpix: -32,
      shape: [2, 2, 2],
      pixels,
    });

    const path = await writeTemporaryFits(fits);

    const file = await FITSParser.loadFITSFile(path);

    const image = file?.primaryHDU;

    expect(image).not.toBeNull();

    expect(image?.shape).toEqual([2, 2, 2]);

    expect(image?.typedData).toBeInstanceOf(Float32Array);

    const values = Array.from(image?.typedData as Float32Array);

    values.forEach((value, index) => {
      expect(value).toBeCloseTo(pixels[index]);
    });
  });

  test("preserves full BITPIX=64 precision in typedData", async () => {
    const pixels = [9007199254740992n, 9007199254740993n];

    const fits = createSyntheticFits({
      bitpix: 64,
      shape: [2],
      pixels,
    });

    const path = await writeTemporaryFits(fits);

    const file = await FITSParser.loadFITSFile(path);

    const data = file?.primaryHDU?.typedData;

    expect(data).toBeInstanceOf(BigInt64Array);

    expect(Array.from(data as BigInt64Array)).toEqual(pixels);
  });

  test("loads multiple FITS image HDUs", async () => {
    const primary = createSyntheticImageHDU({
      primary: true,
      bitpix: 16,
      shape: [2, 1],
      pixels: [-10, 20],
    });

    const extension1 = createSyntheticImageHDU({
      primary: false,
      bitpix: -32,
      shape: [2, 2],
      pixels: [1.5, 2.5, 3.5, 4.5],
    });

    const extension2 = createSyntheticImageHDU({
      primary: false,
      bitpix: 8,
      shape: [3],
      pixels: [10, 20, 30],
    });

    const fits = createSyntheticMultiHDUFits([primary, extension1, extension2]);

    const path = await writeTemporaryFits(fits);

    const file = await FITSParser.loadFITSFile(path);

    expect(file).not.toBeNull();

    if (!file) {
      throw new Error("FITS file unexpectedly null");
    }

    expect(file.length).toBe(3);

    expect(file.primaryHDU).not.toBeNull();

    expect(file.getHDU(0)?.type).toBe("PRIMARY");

    expect(file.getHDU(1)?.type).toBe("IMAGE");

    expect(file.getHDU(2)?.type).toBe("IMAGE");
  });

  test("loads a BINTABLE extension", async () => {
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

    expect(file).not.toBeNull();

    if (!file) {
      throw new Error("FITS file unexpectedly null");
    }

    expect(file.length).toBe(2);

    expect(file.getHDU(0)?.type).toBe("PRIMARY");

    const hdu = file.getHDU(1);

    expect(hdu).toBeInstanceOf(BinaryTableHDU);

    if (!(hdu instanceof BinaryTableHDU)) {
      throw new Error("Expected second HDU to be a BinaryTableHDU");
    }

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

function createBinaryTableRow(id: number, flux: number): Uint8Array {
  const buffer = new ArrayBuffer(8);

  const view = new DataView(buffer);

  view.setInt32(0, id, false);

  view.setFloat32(4, flux, false);

  return new Uint8Array(buffer);
}
