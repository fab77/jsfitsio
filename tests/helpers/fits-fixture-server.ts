import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const FIXTURE_ROOT = path.resolve("tests/resources");

export async function startFITSFixtureServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? "/", "http://localhost");

      if (requestUrl.pathname === "/Npix47180.fits") {
        const filePath = path.join(FIXTURE_ROOT, "Npix47180.fits");
        const body = await fs.readFile(filePath);

        res.statusCode = 200;
        res.setHeader("content-type", "application/fits");
        res.end(body);
        return;
      }

      if (requestUrl.pathname === "/not-found.fits") {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      res.statusCode = 404;
      res.end("Not found");
    } catch (error) {
      console.error("[FITS fixture] Server error:", error);

      res.statusCode = 500;
      res.end("Fixture server error");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);

    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine fixture server port");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,

    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }),
  };
}