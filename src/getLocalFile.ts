import { readFile } from "node:fs/promises";


export async function getLocalFile(path:string) {
    // let buffer: Buffer;
    try {
        const response: Buffer = await readFile(path);
        if (response) {
            return response;
        } else {
            return null;
        }
        // buffer = await readFile(path);
        
    } catch (error) {
    console.error("Failed to read path:", path, "\nError:", error);
    return null;
  }
    
}
