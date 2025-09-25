import { FITSWriter } from "./FITSWriter.js";
import { ParsePayload } from "./ParsePayload.js";
import { ParseHeader } from "./ParseHeader.js";
import { FITSHeaderManager } from "./model/FITSHeaderManager.js";
export class FITSParser {
    static async loadFITS(url) {
        try {
            const uint8data = await FITSParser.getFile(url);
            if (uint8data?.byteLength) {
                const fits = FITSParser.processFits(uint8data);
                return fits;
            }
        }
        catch (error) {
            console.error("Error loading FITS file:", error);
        }
        return null;
    }
    static processFits(rawdata) {
        const header = ParseHeader.parse(rawdata);
        const headerFinalised = ParsePayload.computePhysicalMinAndMax(header, rawdata);
        if (headerFinalised == null) {
            return null;
        }
        // Assuming no additional header blocks
        const dataOffset = 2880;
        const payloadBuffer = new Uint8Array(rawdata.slice(dataOffset));
        // --- pad payload to multiple of 2880 ---
        const paddedPayload = padTo2880(payloadBuffer);
        const payloadMatrix = FITSParser.createMatrix(paddedPayload, header);
        return {
            header: headerFinalised,
            data: payloadMatrix
        };
        // helper
        function padTo2880(buf) {
            const remainder = buf.length % 2880;
            if (remainder === 0)
                return buf;
            const padded = new Uint8Array(buf.length + (2880 - remainder));
            padded.set(buf);
            // the extra bytes are left as 0 (valid FITS padding)
            return padded;
        }
    }
    static createMatrix(payload, header) {
        const NAXIS1 = ParseHeader.getFITSItemValue(header, FITSHeaderManager.NAXIS1);
        if (NAXIS1 === null) {
            throw new Error("NAXIS1 not defined.");
        }
        const NAXIS2 = ParseHeader.getFITSItemValue(header, FITSHeaderManager.NAXIS2);
        if (NAXIS2 === null) {
            throw new Error("NAXIS2 not defined.");
        }
        const BITPIX = ParseHeader.getFITSItemValue(header, FITSHeaderManager.BITPIX);
        if (BITPIX === null) {
            throw new Error("BITPIX not defined.");
        }
        const bytesXelem = Math.abs(BITPIX / 8);
        // if (payload.length !== NAXIS1 * NAXIS2 * bytesXelem) {
        //   throw new Error("Payload size does not match the expected matrix dimensions.");
        // }
        // const matrix: Array<Uint8Array> = [];
        const matrix = [];
        for (let i = 0; i < NAXIS2; i++) {
            matrix.push(payload.slice(i * NAXIS1 * bytesXelem, (i + 1) * NAXIS1 * bytesXelem));
        }
        return matrix;
    }
    // static generateFITSForWeb(fitsParsed: FITSParsed) {
    //   return FITSWriter.typedArrayToURL(fitsParsed)
    // }
    static saveFITSLocally(fitsParsed, path) {
        return FITSWriter.writeFITSFile(fitsParsed, path);
    }
    static async getFile(uri) {
        if (!uri.substring(0, 5).toLowerCase().includes("http")) {
            const p = await import('./getLocalFile.js');
            const rawData = await p.getLocalFile(uri);
            if (rawData?.length) {
                const uint8 = new Uint8Array(rawData);
                return uint8;
            }
            return new Uint8Array(0);
        }
        else {
            const p = await import('./getFile.js');
            const rawData = await p.getFile(uri);
            if (rawData?.byteLength) {
                const uint8 = new Uint8Array(rawData);
                return uint8;
            }
            return new Uint8Array(0);
        }
    }
}
// const url = "http://skies.esac.esa.int/Herschel/normalized/PACS_hips160//Norder8/Dir40000/Npix47180.fits"
// FITSParser.loadFITS(url).then((fits) => {
//   if (fits == null) {
//     return null
//   }
//   const path = "./fitsTest1.fits"
//   console.log(fits.header)
//   FITSParser.saveFITSLocally(fits, path)
//   console.log("finished")
// })
// // const file = "/Users/fabriziogiordano/Desktop/PhD/code/new/FITSParser/tests/inputs/empty.fits"
// const file = "/Users/fabriziogiordano/Desktop/PhD/code/new/FITSParser/tests/inputs/Npix43348.fits"
// FITSParser.loadFITS(file).then((fits) => {
//   if (fits == null) {
//     return null
//   }
//   const path = "./fitsTest2.fits"
//   console.log(fits.header)
//   FITSParser.saveFITSLocally(fits, path)
//   console.log("finished")
// })
//# sourceMappingURL=FITSParser.js.map