import {
  describe,
  expect,
  test,
} from "@jest/globals";

import { ParseHeader } from "../src/ParseHeader";
import { FITSHeaderManager } from "../src/model/FITSHeaderManager";

import {
  createSyntheticFits,
  FITS_TEST_CONSTANTS,
} from "./helpers/synthetic-fits";

describe("ParseHeader", () => {
  test("detects a single-block FITS header", () => {
    const fits = createSyntheticFits({
      headerBlocks: 1,
      pixels: [-10, 20],
    });

    expect(
      ParseHeader.getHeaderByteLength(fits),
    ).toBe(FITS_TEST_CONSTANTS.BLOCK_SIZE);
  });

  test("detects a two-block FITS header", () => {
    const fits = createSyntheticFits({
      headerBlocks: 2,
      pixels: [-10, 20],
    });

    expect(
      ParseHeader.getHeaderByteLength(fits),
    ).toBe(
      2 * FITS_TEST_CONSTANTS.BLOCK_SIZE,
    );
  });

  test("parses keywords located before END in a two-block header", () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      naxis1: 2,
      naxis2: 1,
      headerBlocks: 2,
      pixels: [-10, 20],
    });

    const header = ParseHeader.parse(fits);

    expect(
      ParseHeader.getFITSItemValue(
        header,
        FITSHeaderManager.BITPIX,
      ),
    ).toBe(16);

    expect(
      ParseHeader.getFITSItemValue(
        header,
        FITSHeaderManager.NAXIS1,
      ),
    ).toBe(2);

    expect(
      ParseHeader.getFITSItemValue(
        header,
        FITSHeaderManager.NAXIS2,
      ),
    ).toBe(1);
  });

  test("throws if END card is missing", () => {
    /*
     * A complete FITS block containing spaces but no END card.
     */
    const invalid = new Uint8Array(
      FITS_TEST_CONSTANTS.BLOCK_SIZE,
    );

    invalid.fill(0x20);

    expect(() =>
      ParseHeader.getHeaderByteLength(invalid),
    ).toThrow(
      "Invalid FITS header: END card not found.",
    );
  });
});