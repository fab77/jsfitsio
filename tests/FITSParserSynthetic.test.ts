import { afterEach, describe, expect, test } from "@jest/globals";

import { suppressConsoleError } from "./helpers/console";

import { FITSParser } from "../src/FITSParser";
import { FITSHeaderManager } from "../src/model/FITSHeaderManager";

import { createSyntheticFits } from "./helpers/synthetic-fits";

import {
  cleanupTemporaryFits,
  writeTemporaryFits,
} from "./helpers/temporary-fits";

afterEach(cleanupTemporaryFits);

describe("FITSParser synthetic FITS", () => {
  test("loadFITSFile does not compute missing DATAMIN/DATAMAX by default", async () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      shape: [2, 1],
      pixels: [-10, 20],
    });

    const path = await writeTemporaryFits(fits);

    const fitsFile = await FITSParser.loadFITSFile(path);

    expect(fitsFile).not.toBeNull();

    const primary = fitsFile?.primaryHDU;

    expect(primary).not.toBeNull();

    expect(primary?.header.findById(FITSHeaderManager.DATAMIN)).toBeNull();

    expect(primary?.header.findById(FITSHeaderManager.DATAMAX)).toBeNull();
  });

  test("loadFITSFile computes missing DATAMIN/DATAMAX when enabled", async () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      shape: [2, 1],
      pixels: [-10, 20],
    });

    const path = await writeTemporaryFits(fits);

    const fitsFile = await FITSParser.loadFITSFile(path, {
      computeDataMinMax: true,
    });

    expect(fitsFile).not.toBeNull();

    const primary = fitsFile?.primaryHDU;

    expect(primary).not.toBeNull();

    expect(primary?.header.findById(FITSHeaderManager.DATAMIN)?.value).toBe(
      -10,
    );

    expect(primary?.header.findById(FITSHeaderManager.DATAMAX)?.value).toBe(20);
  });

  test("loadFITSFile preserves DATAMIN/DATAMAX from the header", async () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      shape: [2, 1],
      pixels: [-10, 20],
      datamin: -100,
      datamax: 100,
    });

    const path = await writeTemporaryFits(fits);

    const fitsFile = await FITSParser.loadFITSFile(path, {
      computeDataMinMax: true,
    });

    const primary = fitsFile?.primaryHDU;

    expect(primary).not.toBeNull();

    expect(primary?.header.findById(FITSHeaderManager.DATAMIN)?.value).toBe(
      -100,
    );

    expect(primary?.header.findById(FITSHeaderManager.DATAMAX)?.value).toBe(
      100,
    );
  });

  test("loadFITSFile preserves existing DATAMIN and computes missing DATAMAX", async () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      shape: [3, 1],
      pixels: [-10, 5, 20],
      datamin: -100,
    });

    const path = await writeTemporaryFits(fits);

    const fitsFile = await FITSParser.loadFITSFile(path, {
      computeDataMinMax: true,
    });

    const primary = fitsFile?.primaryHDU;

    expect(primary).not.toBeNull();

    expect(primary?.header.findById(FITSHeaderManager.DATAMIN)?.value).toBe(
      -100,
    );

    expect(primary?.header.findById(FITSHeaderManager.DATAMAX)?.value).toBe(20);
  });

  test("loadFITSFile computes physical range using BSCALE/BZERO and ignores BLANK", async () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      shape: [4, 1],
      pixels: [-999, 1, 2, 3],
      blank: -999,
      bscale: 2,
      bzero: 10,
    });

    const path = await writeTemporaryFits(fits);

    const fitsFile = await FITSParser.loadFITSFile(path, {
      computeDataMinMax: true,
    });

    const primary = fitsFile?.primaryHDU;

    expect(primary).not.toBeNull();

    expect(primary?.header.findById(FITSHeaderManager.DATAMIN)?.value).toBe(12);

    expect(primary?.header.findById(FITSHeaderManager.DATAMAX)?.value).toBe(16);
  });

  test("reads payload after a two-block header", async () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      shape: [2, 1],
      headerBlocks: 2,
      pixels: [-10, 20],
    });

    const path = await writeTemporaryFits(fits);

    const parsed = await FITSParser.loadFITS(path, {
      computeDataMinMax: true,
    });

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

    const parsed = await FITSParser.loadFITS(path, {
      computeDataMinMax: true,
    });

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
    const consoleErrorSpy = suppressConsoleError();

    try {
      const fitsFile = await FITSParser.loadFITSFile("./notexistent.fits");

      expect(fitsFile).toBeNull();

      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
