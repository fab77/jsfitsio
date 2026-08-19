import {
  describe,
  expect,
  test,
} from "@jest/globals";

import { FITSFile } from "../src/model/FITSFile";
import { PrimaryHDU } from "../src/model/PrimaryHDU";
import { ImageHDU } from "../src/model/ImageHDU";
import { FITSHeaderManager } from "../src/model/FITSHeaderManager";

describe("FITSFile data model", () => {
  test("creates an empty FITS file", () => {
    const file = new FITSFile();

    expect(file.length).toBe(0);
    expect(file.hdus).toHaveLength(0);
    expect(file.primaryHDU).toBeNull();
  });

  test("contains a primary HDU", () => {
    const header =
      new FITSHeaderManager();

    const payload =
      new Uint8Array([
        0xff,
        0xf6,
        0x00,
        0x14,
      ]);

    const typedData =
      new Int16Array([
        -10,
        20,
      ]);

    const primary =
      new PrimaryHDU(
        header,
        payload,
        5760,
        4,
        16,
        [2, 1],
        typedData,
      );

    const file =
      new FITSFile([
        primary,
      ]);

    expect(file.length).toBe(1);

    expect(
      file.primaryHDU,
    ).toBe(primary);

    expect(
      file.getHDU(0),
    ).toBe(primary);

    expect(
      file.getHDU(1),
    ).toBeNull();
  });

  test("primary HDU is also an ImageHDU", () => {
    const primary =
      new PrimaryHDU(
        new FITSHeaderManager(),
        new Uint8Array(0),
        2880,
        0,
        16,
        [0, 0],
        new Int16Array(0),
      );

    expect(
      primary instanceof ImageHDU,
    ).toBe(true);
  });

  test("stores payload metadata", () => {
    const payload =
      new Uint8Array([
        0xff,
        0xf6,
        0x00,
        0x14,
      ]);

    const typedData =
      new Int16Array([
        -10,
        20,
      ]);

    const primary =
      new PrimaryHDU(
        new FITSHeaderManager(),
        payload,
        5760,
        4,
        16,
        [2, 1],
        typedData,
      );

    expect(
      primary.type,
    ).toBe("PRIMARY");

    expect(
      primary.dataOffset,
    ).toBe(5760);

    expect(
      primary.dataByteLength,
    ).toBe(4);

    expect(
      primary.rawData,
    ).toBe(payload);

    expect(
      primary.bitpix,
    ).toBe(16);

    expect(
      primary.shape,
    ).toEqual([
      2,
      1,
    ]);

    expect(
      primary.naxis,
    ).toBe(2);

    expect(
      primary.elementCount,
    ).toBe(2);

    expect(
      primary.typedData,
    ).toBe(typedData);
  });

  test("can append HDUs", () => {
    const file =
      new FITSFile();

    const primary =
      new PrimaryHDU(
        new FITSHeaderManager(),
        null,
        2880,
        0,
        16,
        [0, 0],
        new Int16Array(0),
      );

    file.addHDU(
      primary,
    );

    expect(
      file.length,
    ).toBe(1);

    expect(
      file.getHDU(0),
    ).toBe(primary);
  });

  test("supports a 3D image cube", () => {
    const typedData =
      new Float32Array([
        1, 2, 3, 4,
        5, 6, 7, 8,
      ]);

    const primary =
      new PrimaryHDU(
        new FITSHeaderManager(),
        new Uint8Array(
          typedData.byteLength,
        ),
        2880,
        typedData.byteLength,
        -32,
        [2, 2, 2],
        typedData,
      );

    expect(
      primary.naxis,
    ).toBe(3);

    expect(
      primary.shape,
    ).toEqual([
      2,
      2,
      2,
    ]);

    expect(
      primary.elementCount,
    ).toBe(8);

    expect(
      primary.bitpix,
    ).toBe(-32);

    expect(
      primary.typedData,
    ).toBeInstanceOf(
      Float32Array,
    );
  });
});