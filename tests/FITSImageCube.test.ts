import { afterEach, describe, expect, test } from "@jest/globals";
import { FITSParser } from "../src/FITSParser";
import { createSyntheticFits } from "./helpers/synthetic-fits";

import {
  cleanupTemporaryFits,
  writeTemporaryFits,
} from "./helpers/temporary-fits";

afterEach(cleanupTemporaryFits);

describe("FITS image cubes", () => {
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
});
