import sharp from "sharp";
import { PHOTO_LIMIT, ProductProblem } from "./contracts";

/** Pure server image processing; decode and re-encode instead of trusting MIME. */
export async function normalizePhoto(input: Uint8Array, mime: string): Promise<Buffer> {
  if (!input.byteLength) throw new ProductProblem("PHOTO_INVALID");
  if (input.byteLength > PHOTO_LIMIT) throw new ProductProblem("PHOTO_TOO_LARGE");
  const formats: Record<string,string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  const bytes = Buffer.from(input);
  const detected = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpeg"
    : bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png"
    : bytes.subarray(0,4).toString("ascii") === "RIFF" && bytes.subarray(8,12).toString("ascii") === "WEBP" ? "webp" : null;
  // Reject SVG/other parsers before handing untrusted bytes to the image decoder.
  if (!detected || formats[mime] !== detected) throw new ProductProblem("PHOTO_INVALID");
  try {
    const image = sharp(input, { limitInputPixels: 16_000_000, animated: true, failOn: "warning" });
    const info = await image.metadata();
    if (!formats[mime] || info.format !== formats[mime] || (info.pages ?? 1) !== 1) throw new Error("FORMAT");
    const output = await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    if (output.byteLength > PHOTO_LIMIT) throw new ProductProblem("PHOTO_TOO_LARGE"); return output;
  } catch (error) { if (error instanceof ProductProblem) throw error; throw new ProductProblem("PHOTO_INVALID"); }
}
