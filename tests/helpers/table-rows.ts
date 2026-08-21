export function createBinaryTableRow(id: number, flux: number): Uint8Array {
  const buffer = new ArrayBuffer(8);

  const view = new DataView(buffer);

  view.setInt32(0, id, false);

  view.setFloat32(4, flux, false);

  return new Uint8Array(buffer);
}

export function createAsciiTableRow(
  id: number,
  name: string,
  flux: number,
): string {
  return (
    String(id).padStart(4, " ") +
    " " +
    name.padEnd(8, " ").slice(0, 8) +
    flux.toFixed(2).padStart(7, " ")
  );
}
