import {
  afterEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import {
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";

import { tmpdir } from "node:os";
import { join } from "node:path";

import { FITSParser } from "../src/FITSParser";
import { FITSHeaderManager } from "../src/model/FITSHeaderManager";

import {
  createSyntheticFits,
} from "./helpers/synthetic-fits";

let temporaryDirectories: string[] = [];

async function writeTemporaryFits(
  fits: Uint8Array,
): Promise<string> {
  const directory = await mkdtemp(
    join(tmpdir(), "jsfitsio-test-"),
  );

  temporaryDirectories.push(directory);

  const path = join(
    directory,
    "synthetic.fits",
  );

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
      naxis1: 2,
      naxis2: 1,
      headerBlocks: 2,
      pixels: [-10, 20],
    });

    const path = await writeTemporaryFits(
      fits,
    );

    const parsed =
      await FITSParser.loadFITS(path);

    expect(parsed).not.toBeNull();

    if (!parsed) {
      throw new Error(
        "FITS parser unexpectedly returned null",
      );
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
    expect(
      Array.from(parsed.data[0]),
    ).toEqual([
      0xff,
      0xf6,
      0x00,
      0x14,
    ]);
  });

  test("computes correct DATAMIN and DATAMAX", async () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      naxis1: 2,
      naxis2: 1,
      headerBlocks: 2,
      pixels: [-10, 20],
    });

    const path = await writeTemporaryFits(
      fits,
    );

    const parsed =
      await FITSParser.loadFITS(path);

    expect(parsed).not.toBeNull();

    if (!parsed) {
      throw new Error(
        "FITS parser unexpectedly returned null",
      );
    }

    expect(
      parsed.header.findById(
        FITSHeaderManager.DATAMIN,
      )?.value,
    ).toBe(-10);

    expect(
      parsed.header.findById(
        FITSHeaderManager.DATAMAX,
      )?.value,
    ).toBe(20);
  });
});