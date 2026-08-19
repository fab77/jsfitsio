import { describe, expect, test } from "@jest/globals";

import { ParsePayload } from "../src/ParsePayload";

import { createPayload } from "./helpers/synthetic-fits";

import { ParseHeader } from "../src/ParseHeader";

import { createSyntheticFits } from "./helpers/synthetic-fits";

describe("ParsePayload physical values", () => {
  test("computes min/max without BLANK keyword", () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      naxis1: 3,
      naxis2: 1,
      pixels: [-10, 0, 20],
    });

    const header = ParseHeader.parse(fits);

    const headerLength = ParseHeader.getHeaderByteLength(fits);

    const payload = fits.subarray(headerLength, headerLength + 6);

    const [min, max] = ParsePayload.computePhysicalValues(payload, header);

    expect(min).toBe(-10);
    expect(max).toBe(20);
  });

  test("applies BSCALE and BZERO", () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      naxis1: 3,
      naxis2: 1,

      bscale: 2,
      bzero: 100,

      pixels: [-10, 0, 20],
    });

    const header = ParseHeader.parse(fits);

    const headerLength = ParseHeader.getHeaderByteLength(fits);

    const payload = fits.subarray(headerLength, headerLength + 6);

    const [min, max] = ParsePayload.computePhysicalValues(payload, header);

    /*
     * physical = BZERO + BSCALE * raw
     *
     * -10 -> 80
     *   0 -> 100
     *  20 -> 140
     */
    expect(min).toBe(80);
    expect(max).toBe(140);
  });

  test("ignores integer BLANK value", () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      naxis1: 4,
      naxis2: 1,

      blank: -999,

      pixels: [-10, -999, 0, 20],
    });

    const header = ParseHeader.parse(fits);

    const headerLength = ParseHeader.getHeaderByteLength(fits);

    const payload = fits.subarray(headerLength, headerLength + 8);

    const [min, max] = ParsePayload.computePhysicalValues(payload, header);

    expect(min).toBe(-10);
    expect(max).toBe(20);
  });

  test("zero is a valid minimum", () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      naxis1: 3,
      naxis2: 1,
      pixels: [0, 10, 20],
    });

    const header = ParseHeader.parse(fits);

    const headerLength = ParseHeader.getHeaderByteLength(fits);

    const payload = fits.subarray(headerLength, headerLength + 6);

    const [min, max] = ParsePayload.computePhysicalValues(payload, header);

    expect(min).toBe(0);
    expect(max).toBe(20);
  });

  test("ignores NaN when computing floating-point min/max", () => {
    const fits = createSyntheticFits({
      bitpix: -32,
      naxis1: 4,
      naxis2: 1,

      pixels: [-10, Number.NaN, 0, 20],
    });

    const header = ParseHeader.parse(fits);

    const headerLength = ParseHeader.getHeaderByteLength(fits);

    const payload = fits.subarray(headerLength, headerLength + 16);

    const [min, max] = ParsePayload.computePhysicalValues(payload, header);

    expect(min).toBe(-10);
    expect(max).toBe(20);
  });

  test("two-block synthetic FITS places payload at byte 5760", () => {
    const fits = createSyntheticFits({
      bitpix: 16,
      naxis1: 2,
      naxis2: 1,
      headerBlocks: 2,
      pixels: [-10, 20],
    });

    const payloadOffset = 5760;

    expect(Array.from(fits.subarray(payloadOffset, payloadOffset + 4))).toEqual(
      [0xff, 0xf6, 0x00, 0x14],
    );
  });
});

describe("ParsePayload BITPIX decoding", () => {
  test("BITPIX=8 unsigned integer", () => {
    const payload = createPayload(8, [0, 127, 255]);

    expect(ParsePayload.extractPixelValue(payload, 0, 8)).toBe(0);

    expect(ParsePayload.extractPixelValue(payload, 1, 8)).toBe(127);

    expect(ParsePayload.extractPixelValue(payload, 2, 8)).toBe(255);
  });

  test("BITPIX=16 signed big-endian integer", () => {
    const payload = createPayload(16, [-32768, -10, 0, 20, 32767]);

    expect(ParsePayload.extractPixelValue(payload, 0, 16)).toBe(-32768);

    expect(ParsePayload.extractPixelValue(payload, 2, 16)).toBe(-10);

    expect(ParsePayload.extractPixelValue(payload, 4, 16)).toBe(0);

    expect(ParsePayload.extractPixelValue(payload, 6, 16)).toBe(20);

    expect(ParsePayload.extractPixelValue(payload, 8, 16)).toBe(32767);
  });

  test("BITPIX=32 signed big-endian integer", () => {
    const payload = createPayload(32, [-2147483648, -10, 0, 20, 2147483647]);

    expect(ParsePayload.extractPixelValue(payload, 0, 32)).toBe(-2147483648);

    expect(ParsePayload.extractPixelValue(payload, 4, 32)).toBe(-10);

    expect(ParsePayload.extractPixelValue(payload, 8, 32)).toBe(0);

    expect(ParsePayload.extractPixelValue(payload, 12, 32)).toBe(20);

    expect(ParsePayload.extractPixelValue(payload, 16, 32)).toBe(2147483647);
  });

  test("BITPIX=-32 IEEE float", () => {
    const payload = createPayload(-32, [-1.5, 0, 3.25]);

    expect(ParsePayload.extractPixelValue(payload, 0, -32)).toBeCloseTo(-1.5);

    expect(ParsePayload.extractPixelValue(payload, 4, -32)).toBeCloseTo(0);

    expect(ParsePayload.extractPixelValue(payload, 8, -32)).toBeCloseTo(3.25);
  });

  test("BITPIX=-64 IEEE double", () => {
    const payload = createPayload(-64, [-Math.PI, 0, Math.PI]);

    expect(ParsePayload.extractPixelValue(payload, 0, -64)).toBeCloseTo(
      -Math.PI,
      14,
    );

    expect(ParsePayload.extractPixelValue(payload, 8, -64)).toBe(0);

    expect(ParsePayload.extractPixelValue(payload, 16, -64)).toBeCloseTo(
      Math.PI,
      14,
    );
  });

  test("BITPIX=64 safe signed integer", () => {
    const payload = createPayload(64, [-10n, 0n, 20n]);

    expect(ParsePayload.extractPixelValue(payload, 0, 64)).toBe(-10);

    expect(ParsePayload.extractPixelValue(payload, 8, 64)).toBe(0);

    expect(ParsePayload.extractPixelValue(payload, 16, 64)).toBe(20);
  });

  test("BITPIX=64 rejects integers outside Number safe range", () => {
    const payload = createPayload(64, [9007199254740992n]);

    expect(() => ParsePayload.extractPixelValue(payload, 0, 64)).toThrow(
      RangeError,
    );
  });
});
