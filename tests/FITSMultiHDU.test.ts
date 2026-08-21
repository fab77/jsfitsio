import { afterEach, describe, expect, test } from "@jest/globals";
import { FITSParser } from "../src/FITSParser";
import {  createSyntheticImageHDU, createSyntheticMultiHDUFits } from "./helpers/synthetic-fits";

import {
  cleanupTemporaryFits,
  writeTemporaryFits,
} from "./helpers/temporary-fits";

afterEach(cleanupTemporaryFits);

describe("FITS multi-HDU parsing", () => {
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
});
