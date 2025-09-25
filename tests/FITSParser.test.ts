import { describe, expect, test, jest } from '@jest/globals';
import { FITSParser } from "../src/FITSParser";
import { FITSParsed } from "../src/model/FITSParsed";
import { FITSHeaderManager } from '../src/model/FITSHeaderManager';
import { header, data } from "./inputs/Npix47180"
import { FITSWriter } from '../src/FITSWriter';

test('[parse_hips__fits_1] Parse FITS from URL', async () => {
  const url = "http://skies.esac.esa.int/Herschel/normalized/PACS_hips160//Norder8/Dir40000/Npix47180.fits";
  const fits = new URL(url)
  const parsedFITS = await FITSParser.loadFITS(fits.toString());

  expect(parsedFITS).not.toBeNull();
  expect(parsedFITS?.header).toBeInstanceOf(FITSHeaderManager);
  expect(parsedFITS?.data).toBeInstanceOf(Array);
  const dataLength = parsedFITS ? parsedFITS?.data.length : 0
  expect(dataLength * 4096).toBe(2097152);
  expect(parsedFITS?.header.getItems().length).toBe(11);

}, 15000);


test('[parse_hips_fits_2] Create FITS programmatically from FITSParsed', async () => {

  const fitsParsed: FITSParsed = {
    header: header,
    data: data
  }

  const FITS_FILE_PATH = "./tests/resources/parse_hips_fits_2.fits"
  FITSParser.saveFITSLocally(fitsParsed, FITS_FILE_PATH)
  const parsedFITS = await FITSParser.loadFITS(FITS_FILE_PATH);

  expect(parsedFITS).not.toBeNull();
  expect(parsedFITS?.header).toBeInstanceOf(FITSHeaderManager);
  expect(parsedFITS?.data).toBeInstanceOf(Array);
  const dataLength = parsedFITS ? parsedFITS?.data.length : 0
  expect(dataLength * 4096).toBe(2097152);
  expect(parsedFITS?.header.getItems().length).toBe(11);
}, 15000);


test('[parse_hips_fits_3] Create local FITS from FITS from URL', async () => {
  const url = "http://skies.esac.esa.int/Herschel/normalized/PACS_hips160//Norder8/Dir40000/Npix47180.fits";
  const fits = new URL(url)
  const parsedFITS = await FITSParser.loadFITS(fits.toString());

  if (parsedFITS !== null) {
    FITSParser.saveFITSLocally(parsedFITS, "./tests/resources/parse_hips_fits_3.fits")
  }

  expect(parsedFITS).not.toBeNull();
  expect(parsedFITS?.header).toBeInstanceOf(FITSHeaderManager);
  expect(parsedFITS?.data).toBeInstanceOf(Array);
  const dataLength = parsedFITS ? parsedFITS?.data.length : 0
  expect(dataLength * 4096).toBe(2097152);
  expect(parsedFITS?.header.getItems().length).toBe(11);
}, 15000);


test('[parse_hips_fits_3] Should return null if fetch fails', async () => {
  const fits = await FITSParser.loadFITS("http://invalid-url");
  expect(fits).toBeNull();
}, 15000);


test('[parse_hips_fits_3] Should return null if local filesystem load fails', async () => {
  const fits = await FITSParser.loadFITS("./notexistent.fits");
  expect(fits).toBeNull();
}, 15000);


test('[parse_mercator_fits_1] Parse FITS from filesystem', async () => {
  const path = "./tests/resources/Mercator46.fits";
  const parsedFITS = await FITSParser.loadFITS(path);

  expect(parsedFITS).not.toBeNull();
  expect(parsedFITS?.header).toBeInstanceOf(FITSHeaderManager);
  expect(parsedFITS?.data).toBeInstanceOf(Array);
  const dataLength = parsedFITS ? parsedFITS?.data.length : 0
  expect(parsedFITS?.header.getItems().length).toBe(20);

}, 15000);

// test('[parse_hips_fits] Generate web data', async () => {
//   const path = "./tests/resources/Npix47180.fits";
//   const parsedFITS = await FITSParser.loadFITS(path);

//   expect(parsedFITS).not.toBeNull();

//   const data = FITSWriter.typedArrayToURL(parsedFITS!);
//   console.log(data)
//   expect(data).not.toBeNull();

// }, 15000);


