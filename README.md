# jsfitsio

FITS I/O library for JavaScript and TypeScript.

`jsfitsio` reads and writes FITS image data in Node.js and browser-oriented
scientific web applications. It is designed as a lightweight building block for
astronomy, astrophysics and scientific data visualisation workflows.

The project is available on GitHub:

https://github.com/fab77/jsfitsio

## Features

- Read FITS files from remote URLs.
- Read FITS files from the local filesystem in Node.js.
- Parse FITS headers into a `FITSHeaderManager`.
- Return image data as arrays of `Uint8Array` rows.
- Write parsed FITS data back to local FITS files in Node.js.
- Provide ESM, CommonJS and browser bundle outputs.

## Current scope

`jsfitsio` currently focuses on image HDUs.

Supported `BITPIX` values follow the FITS standard:

- `8`: character or unsigned binary integer
- `16`: 16-bit two's-complement binary integer
- `32`: 32-bit two's-complement binary integer
- `64`: 64-bit two's-complement binary integer
- `-32`: IEEE single-precision floating point
- `-64`: IEEE double-precision floating point

## Installation

```bash
npm install jsfitsio
```

The package currently targets Node.js `>=22.0.0`.

## Usage

### Read a FITS file from a URL

```ts
import { FITSParser } from "jsfitsio";

const url =
  "http://skies.esac.esa.int/Herschel/normalized/PACS_hips160//Norder8/Dir40000/Npix47180.fits";

const fits = await FITSParser.loadFITS(url);

if (fits !== null) {
  console.log(fits.header.getItems());
  console.log(`BITPIX: ${fits.header.findById("BITPIX")?.value}`);
  console.log(`NAXIS1: ${fits.header.findById("NAXIS1")?.value}`);
  console.log(`NAXIS2: ${fits.header.findById("NAXIS2")?.value}`);
  console.log(`Rows: ${fits.data.length}`);
} else {
  console.log("No FITS data loaded.");
}
```

### Read and write a local FITS file in Node.js

```ts
import { FITSParser } from "jsfitsio";

const inputPath = "./tests/resources/Mercator46.fits";
const outputPath = "./output.fits";

const fits = await FITSParser.loadFITS(inputPath);

if (fits !== null) {
  FITSParser.saveFITSLocally(fits, outputPath);
}
```

### Browser bundle

The package also provides browser bundle outputs through `dist/`.

When loaded as a script, the UMD bundle exposes the `jsfitsio` global.

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>jsfitsio browser example</title>
  </head>
  <body>
    <script src="./jsfitsio.js"></script>
    <script>
      const url =
        "http://skies.esac.esa.int/Herschel/normalized/PACS_hips160//Norder8/Dir40000/Npix47180.fits";

      jsfitsio.FITSParser.loadFITS(url).then((fits) => {
        if (fits !== null) {
          console.log(fits.header.getItems());
          console.log(fits.data.length);
        }
      });
    </script>
  </body>
</html>
```

## Build

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build production outputs:

```bash
npm run prod
```

The build generates:

- `lib-esm/` for ESM output and TypeScript declarations
- `dist/jsfitsio.cjs` for CommonJS
- `dist/jsfitsio.js` and `dist/jsfitsio.min.js` for browser usage

## License

`jsfitsio` is licensed under the Apache License, Version 2.0.

See `LICENSE.md`.

## Author

Fabrizio Giordano
