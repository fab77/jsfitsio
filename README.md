# jsfitsio

FITS I/O library for JavaScript and TypeScript.

`jsfitsio` reads and writes FITS data in Node.js and browser-oriented
scientific web applications. It provides a lightweight FITS data model
supporting images, N-dimensional data cubes, multiple HDUs, binary tables
and ASCII tables.

It is designed as a building block for astronomy, astrophysics and
scientific data analysis and visualisation workflows.

The project is available on GitHub:

https://github.com/fab77/jsfitsio

## Features

- Read FITS files from remote HTTP/HTTPS URLs.
- Read FITS files from the local filesystem in Node.js.
- Parse multi-block FITS headers.
- Support FITS files containing multiple HDUs.
- Support Primary HDUs and Image extensions.
- Support N-dimensional FITS images and data cubes.
- Support Binary Table (`BINTABLE`) extensions.
- Support ASCII Table (`TABLE`) extensions.
- Access table data through `getRow()` and `getCell()`.
- Expose image data using native JavaScript TypedArrays.
- Preserve 64-bit integer image data using `BigInt64Array`.
- Read and write FITS files using the `FITSFile` / HDU data model.
- Provide ESM, CommonJS and browser bundle outputs.
- Keep the jsfitsio 2.x API available as a deprecated compatibility layer.

## Supported FITS data

### HDU types

jsfitsio 3.x supports:

- Primary HDU
- Image HDU (`IMAGE`)
- Binary Table HDU (`BINTABLE`)
- ASCII Table HDU (`TABLE`)

### Image data types

Supported FITS `BITPIX` values:

| BITPIX | FITS data type                       | JavaScript representation |
| -----: | ------------------------------------ | ------------------------- |
|    `8` | 8-bit unsigned integer               | `Uint8Array`              |
|   `16` | 16-bit two's-complement integer      | `Int16Array`              |
|   `32` | 32-bit two's-complement integer      | `Int32Array`              |
|   `64` | 64-bit two's-complement integer      | `BigInt64Array`           |
|  `-32` | IEEE single-precision floating point | `Float32Array`            |
|  `-64` | IEEE double-precision floating point | `Float64Array`            |

## Installation

```bash
npm install jsfitsio
```

The package currently targets Node.js `>=22.0.0`.

## Usage

For new applications, use `FITSParser.loadFITSFile()` and the `FITSFile`/HDU data model.

The older `FITSParsed` API is retained only for backward compatibility.

jsfitsio 3.x uses `FITSFile` and HDU objects as its main data model.

The canonical entry point for reading FITS files is:

```ts
FITSParser.loadFITSFile();
```

The returned `FITSFile` may contain:

- `PrimaryHDU`
- `ImageHDU`
- `BinaryTableHDU`
- `AsciiTableHDU`

Image HDUs support N-dimensional data, including FITS cubes.

### Read a FITS file from a URL

```ts
import { FITSParser } from "jsfitsio";

const url =
  "http://skies.esac.esa.int/Herschel/normalized/PACS_hips160//Norder8/Dir40000/Npix47180.fits";
const fitsFile = await FITSParser.loadFITSFile(url);
if (!fitsFile?.primaryHDU) {
  throw new Error("Unable to load FITS file");
}
const image = fitsFile.primaryHDU;
console.log("BITPIX:", image.bitpix);
console.log("Shape:", image.shape);
console.log("Dimensions:", image.naxis);
console.log("Elements:", image.elementCount);
console.log("Data:", image.typedData);
```

---

### Reading a FITS file

```ts
import { FITSParser } from "jsfitsio";

const fitsFile = await FITSParser.loadFITSFile("./example.fits");
if (!fitsFile) {
  throw new Error("Unable to load FITS file");
}
console.log("Number of HDUs:", fitsFile.length);
console.log("Primary HDU:", fitsFile.primaryHDU);
```

`loadFITSFile()` can load both local files in Node.js and HTTP/HTTPS FITS resources.

```ts
const fitsFile = await FITSParser.loadFITSFile(
  "https://example.org/data/image.fits",
);
```

---

### Reading an image FITS

The Primary HDU is represented by `PrimaryHDU`, which extends `ImageHDU`.

```ts
import { FITSParser } from "jsfitsio";

const fitsFile = await FITSParser.loadFITSFile("./image.fits");
if (!fitsFile?.primaryHDU) {
  throw new Error("Primary HDU not found");
}
const image = fitsFile.primaryHDU;
console.log("BITPIX:", image.bitpix);
console.log("Shape:", image.shape);
console.log("Dimensions:", image.naxis);
console.log("Number of elements:", image.elementCount);
```

For example, a FITS header containing:

```text
NAXIS  = 3
NAXIS1 = 1024
NAXIS2 = 1024
NAXIS3 = 20
```

is represented as:

```ts
image.shape;
// [1024, 1024, 20]

image.naxis;
// 3
```

The shape follows FITS axis order:

```text
[NAXIS1, NAXIS2, NAXIS3, ...]
```

---

### Accessing typed image data

Image payloads are exposed through JavaScript TypedArrays.

```ts
const data = image.typedData;
```

The TypedArray type depends on `BITPIX`.

| BITPIX | JavaScript type |
| ------ | --------------- |
| `8`    | `Uint8Array`    |
| `16`   | `Int16Array`    |
| `32`   | `Int32Array`    |
| `64`   | `BigInt64Array` |
| `-32`  | `Float32Array`  |
| `-64`  | `Float64Array`  |

Example:

```ts
if (image.typedData instanceof Float32Array) {
  console.log(image.typedData[0]);
}
```

`BITPIX=64` values are preserved using `BigInt64Array`, avoiding precision loss for integers larger than JavaScript's safe integer range.

---

### Reading FITS cubes

No special cube class is required.

A FITS cube is simply an N-dimensional `ImageHDU`.

```ts
const fitsFile = await FITSParser.loadFITSFile("./cube.fits");
const cube = fitsFile?.primaryHDU;
if (!cube) {
  throw new Error("Cube not found");
}
console.log(cube.shape);
console.log(cube.elementCount);
```

For:

```text
NAXIS1 = 256
NAXIS2 = 256
NAXIS3 = 100
```

the result is:

```ts
cube.shape;
// [256, 256, 100]
cube.elementCount;
// 6553600
```

The payload remains a flat TypedArray:

```ts
const pixels = cube.typedData;
```

The application can interpret the array according to the FITS dimensions.

---

### Reading multiple HDUs

A `FITSFile` may contain multiple HDUs.

```ts
const fitsFile = await FITSParser.loadFITSFile("./multi-hdu.fits");
if (!fitsFile) {
  throw new Error("Unable to load FITS");
}
for (let i = 0; i < fitsFile.length; i++) {
  const hdu = fitsFile.getHDU(i);
  console.log(i, hdu?.type);
}
```

Example output:

```text
0 PRIMARY
1 IMAGE
2 BINTABLE
3 TABLE
```

Individual HDUs can be retrieved with:

```ts
const hdu = fitsFile.getHDU(1);
```

If the index does not exist, `getHDU()` returns `null`.

---

### Reading an ImageHDU extension

```ts
import { FITSParser, ImageHDU } from "jsfitsio";

const fitsFile = await FITSParser.loadFITSFile("./multi-image.fits");
const hdu = fitsFile?.getHDU(1);
if (hdu instanceof ImageHDU) {
  console.log(hdu.shape);
  console.log(hdu.typedData);
}
```

---

### Reading a binary table

Binary FITS tables are represented by `BinaryTableHDU`.

```ts
import { FITSParser, BinaryTableHDU } from "jsfitsio";

const fitsFile = await FITSParser.loadFITSFile("./catalog.fits");
const hdu = fitsFile?.getHDU(1);
if (!(hdu instanceof BinaryTableHDU)) {
  throw new Error("Expected BINTABLE HDU");
}
console.log("Rows:", hdu.rowCount);
console.log("Columns:", hdu.columnCount);
console.log(hdu.columns);
```

Column metadata includes information such as:

```ts
const column = hdu.columns[0];
console.log(column.name);
console.log(column.format);
console.log(column.type);
console.log(column.byteOffset);
console.log(column.byteWidth);
```

---

### Reading BINTABLE cells

Cells can be accessed by column name:

```ts
const id = hdu.getCell(0, "ID");
const flux = hdu.getCell(0, "FLUX");
```

or by zero-based column index:

```ts
const id = hdu.getCell(0, 0);
```

A complete row can be read with:

```ts
const row = hdu.getRow(0);
console.log(row);
```

For a table containing:

```text
ID    FLUX
1     1.5
2     3.25
```

the result may be:

```ts
hdu.getRow(0);
// [1, 1.5]
hdu.getRow(1);
// [2, 3.25]
```

---

### Reading an ASCII FITS table

ASCII tables are represented by `AsciiTableHDU`.

```ts
import { FITSParser, AsciiTableHDU } from "jsfitsio";

const fitsFile = await FITSParser.loadFITSFile("./ascii-table.fits");
const hdu = fitsFile?.getHDU(1);
if (!(hdu instanceof AsciiTableHDU)) {
  throw new Error("Expected ASCII TABLE HDU");
}

console.log(hdu.rowCount);

console.log(hdu.columns);
```

Cells can be accessed by name:

```ts
const id = hdu.getCell(0, "ID");
const name = hdu.getCell(0, "NAME");
const flux = hdu.getCell(0, "FLUX");
```

or as complete rows:

```ts
hdu.getRow(0);
// [1, "STAR-A", 12.5]
```

The original ASCII row is also available:

```ts
const text = hdu.getRowText(0);
```

---

### Writing FITS files

jsfitsio 3.x can serialize the `FITSFile` / HDU data model.

```ts
import { FITSParser, FITSWriter } from "jsfitsio";

const fitsFile = await FITSParser.loadFITSFile("./input.fits");
if (!fitsFile) {
  throw new Error("Unable to load FITS");
}
const serialized = FITSWriter.createFITSFile(fitsFile);
```

`serialized` is a complete FITS file represented as:

```ts
Uint8Array;
```

It can be stored, transmitted, or used to create a browser `Blob`.

---

### FITS read/write round trip

A common workflow is:

```ts
import { FITSParser, FITSWriter } from "jsfitsio";

const original = await FITSParser.loadFITSFile("./input.fits");
if (!original) {
  throw new Error("Unable to read FITS");
}
const bytes = FITSWriter.createFITSFile(original);
```

The serialized FITS preserves the HDU structure:

```text
PrimaryHDU
ImageHDU
BinaryTableHDU
AsciiTableHDU
```

including HDU headers and raw payloads.

---

### Writing a FITS file in Node.js

In Node.js:

```ts
import { FITSParser, FITSWriter } from "jsfitsio";

const fitsFile = await FITSParser.loadFITSFile("./input.fits");
if (!fitsFile) {
  throw new Error("Unable to load FITS");
}
FITSWriter.writeFITSFileModel(fitsFile, "./output.fits");
```

---

### Writing FITS in the browser

`createFITSFile()` returns a `Uint8Array`, so the result can be converted to a browser `Blob`.

```ts
import { FITSWriter } from "jsfitsio";

const bytes = FITSWriter.createFITSFile(fitsFile);
const blob = new Blob([bytes], {
  type: "application/fits",
});
const url = URL.createObjectURL(blob);
```

For example, to trigger a browser download:

```ts
const link = document.createElement("a");
link.href = url;
link.download = "output.fits";
link.click();
URL.revokeObjectURL(url);
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

      jsfitsio.FITSParser.loadFITSFile(url).then((fitsFile) => {
        if (fitsFile?.primaryHDU) {
          const image = fitsFile.primaryHDU;

          console.log("BITPIX:", image.bitpix);
          console.log("Shape:", image.shape);
          console.log("Data:", image.typedData);
        }
      });
    </script>
  </body>
</html>
```

## Migrating from jsfitsio 2.x

### Deprecated API

### Migration example

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
