// One-off script: rasterizes public/icons/icon.svg into the PNG icons used by the PWA manifest.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dir = new URL("../public/icons/", import.meta.url);
const svg = await readFile(new URL("icon.svg", dir));

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  await sharp(svg).resize(size, size).png().toFile(fileURLToPath(new URL(name, dir)));
}

// Maskable icon: shrink the artwork into the inner safe zone (~70%) on a white background.
const inner = await sharp(svg).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#FFFFFF" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(fileURLToPath(new URL("icon-maskable-512.png", dir)));

console.log("Icons generated.");
