import { mkdtemp, rm, writeFile } from "node:fs/promises";

import { tmpdir } from "node:os";
import { join } from "node:path";

const temporaryDirectories: string[] = [];

export async function writeTemporaryFits(fits: Uint8Array): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "jsfitsio-test-"));

  temporaryDirectories.push(directory);

  const path = join(directory, "synthetic.fits");

  await writeFile(path, fits);

  return path;
}

export async function cleanupTemporaryFits(): Promise<void> {
  for (const directory of temporaryDirectories) {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }

  temporaryDirectories.length = 0;
}
