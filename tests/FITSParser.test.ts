import { expect, test } from "@jest/globals";

import { FITSParser } from "../src/FITSParser";
import { FITSParsed } from "../src/model/FITSParsed";
import { FITSHeaderManager } from "../src/model/FITSHeaderManager";
import { header, data } from "./inputs/Npix47180";
import { startFITSFixtureServer } from "./helpers/fits-fixture-server";

test("[parse_hips_fits_1] Parse FITS from local HTTP server", async () => {
  const server = await startFITSFixtureServer();

  try {
    const parsedFITS = await FITSParser.loadFITS(
      `${server.baseUrl}/Npix47180.fits`,
    );

    expect(parsedFITS).not.toBeNull();
    expect(parsedFITS?.header).toBeInstanceOf(FITSHeaderManager);
    expect(parsedFITS?.data).toBeInstanceOf(Array);

    const dataLength = parsedFITS ? parsedFITS.data.length : 0;

    expect(dataLength * 4096).toBe(2097152);

    const dataMin = parsedFITS?.header.findById(FITSHeaderManager.DATAMIN);

    const dataMax = parsedFITS?.header.findById(FITSHeaderManager.DATAMAX);

    expect(dataMin).not.toBeNull();
    expect(dataMax).not.toBeNull();

    expect(Number(dataMin?.value)).toBeLessThanOrEqual(Number(dataMax?.value));

    const items = parsedFITS?.header.getItems() ?? [];

    const dataMinItems = items.filter(
      (item) => item.key === FITSHeaderManager.DATAMIN,
    );

    const dataMaxItems = items.filter(
      (item) => item.key === FITSHeaderManager.DATAMAX,
    );

    expect(dataMinItems).toHaveLength(1);
    expect(dataMaxItems).toHaveLength(1);
  } finally {
    await server.close();
  }
}, 15000);

test("[parse_hips_fits_2] Create FITS programmatically from FITSParsed", async () => {
  const fitsParsed: FITSParsed = {
    header,
    data,
  };

  const fitsFilePath = "./tests/resources/parse_hips_fits_2.fits";

  FITSParser.saveFITSLocally(fitsParsed, fitsFilePath);

  const parsedFITS = await FITSParser.loadFITS(fitsFilePath);

  expect(parsedFITS).not.toBeNull();
  expect(parsedFITS?.header).toBeInstanceOf(FITSHeaderManager);
  expect(parsedFITS?.data).toBeInstanceOf(Array);

  const dataLength = parsedFITS ? parsedFITS.data.length : 0;

  expect(dataLength * 4096).toBe(2097152);

  const dataMin = parsedFITS?.header.findById(FITSHeaderManager.DATAMIN);

  const dataMax = parsedFITS?.header.findById(FITSHeaderManager.DATAMAX);

  expect(dataMin).not.toBeNull();
  expect(dataMax).not.toBeNull();

  expect(Number(dataMin?.value)).toBeLessThanOrEqual(Number(dataMax?.value));
}, 15000);

test("[parse_hips_fits_3] Create local FITS from FITS loaded over local HTTP", async () => {
  const server = await startFITSFixtureServer();

  try {
    const parsedFITS = await FITSParser.loadFITS(
      `${server.baseUrl}/Npix47180.fits`,
    );

    if (parsedFITS !== null) {
      FITSParser.saveFITSLocally(
        parsedFITS,
        "./tests/resources/parse_hips_fits_3.fits",
      );
    }

    expect(parsedFITS).not.toBeNull();
    expect(parsedFITS?.header).toBeInstanceOf(FITSHeaderManager);
    expect(parsedFITS?.data).toBeInstanceOf(Array);

    const dataLength = parsedFITS ? parsedFITS.data.length : 0;

    expect(dataLength * 4096).toBe(2097152);

    const dataMin = parsedFITS?.header.findById(FITSHeaderManager.DATAMIN);

    const dataMax = parsedFITS?.header.findById(FITSHeaderManager.DATAMAX);

    expect(dataMin).not.toBeNull();
    expect(dataMax).not.toBeNull();

    expect(Number(dataMin?.value)).toBeLessThanOrEqual(Number(dataMax?.value));
  } finally {
    await server.close();
  }
}, 15000);

test("[parse_http_failure] Should return null if HTTP fetch fails", async () => {
  const server = await startFITSFixtureServer();

  try {
    const fits = await FITSParser.loadFITS(`${server.baseUrl}/not-found.fits`);

    expect(fits).toBeNull();
  } finally {
    await server.close();
  }
}, 15000);

test("[parse_filesystem_failure] Should return null if local filesystem load fails", async () => {
  const fits = await FITSParser.loadFITS("./notexistent.fits");

  expect(fits).toBeNull();
}, 15000);

test("[parse_mercator_fits_1] Parse FITS from filesystem", async () => {
  const path = "./tests/resources/Mercator46.fits";

  const parsedFITS = await FITSParser.loadFITS(path);

  expect(parsedFITS).not.toBeNull();

  expect(parsedFITS?.header.findById(FITSHeaderManager.BITPIX)).not.toBeNull();

  expect(parsedFITS?.header.findById(FITSHeaderManager.NAXIS)).not.toBeNull();

  expect(parsedFITS?.header.findById(FITSHeaderManager.NAXIS1)).not.toBeNull();

  expect(parsedFITS?.header.findById(FITSHeaderManager.NAXIS2)).not.toBeNull();

  expect(parsedFITS?.header.findById(FITSHeaderManager.DATAMIN)).not.toBeNull();

  expect(parsedFITS?.header.findById(FITSHeaderManager.DATAMAX)).not.toBeNull();
}, 15000);
