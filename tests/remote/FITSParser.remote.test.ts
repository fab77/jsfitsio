import { expect, test } from "@jest/globals";

import { FITSParser } from "../../src/FITSParser";
import { FITSHeaderManager } from "../../src/model/FITSHeaderManager";

test("[remote] Parse Herschel HiPS FITS from ESA", async () => {
  const url =
    "http://skies.esac.esa.int/Herschel/normalized/PACS_hips160/Norder8/Dir40000/Npix47180.fits";

  const parsedFITS = await FITSParser.loadFITS(url);

  expect(parsedFITS).not.toBeNull();
  expect(parsedFITS?.header).toBeInstanceOf(FITSHeaderManager);
  expect(parsedFITS?.data).toBeInstanceOf(Array);

  const dataLength = parsedFITS ? parsedFITS.data.length : 0;

  expect(dataLength * 4096).toBe(2097152);
  expect(parsedFITS?.header.getItems().length).toBe(11);
}, 30000);