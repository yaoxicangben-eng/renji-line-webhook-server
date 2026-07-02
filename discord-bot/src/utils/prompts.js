import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const promptsDir = resolve(__dirname, "../prompts");

export async function loadPrompt(fileName) {
  return readFile(resolve(promptsDir, fileName), "utf8");
}
