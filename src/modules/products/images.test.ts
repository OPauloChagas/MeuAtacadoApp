import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizePhoto } from "./images";

describe("foto validada por conteúdo",() => {
  it("recodifica JPEG/PNG/WebP, remove EXIF e limita dimensões",async () => {
    for (const format of ["jpeg","png","webp"] as const) {
      const input = await sharp({ create: { width: 1800, height: 900, channels: 3, background: "red" } })[format]().withExif({ IFD0: { Artist: "Pessoa fictícia", Copyright: "Fixture" } }).toBuffer();
      const output = await normalizePhoto(input,`image/${format}`); const metadata = await sharp(output).metadata();
      expect(metadata.format).toBe("webp"); expect(metadata.width).toBe(1600); expect(metadata.exif).toBeUndefined(); expect(metadata.xmp).toBeUndefined();
    }
  });
  it("recusa SVG, MIME divergente, bytes inválidos e tamanho excessivo",async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "blue" } }).png().toBuffer();
    for (const [input,mime] of [[Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),"image/png"],[png,"image/jpeg"],[Buffer.from("invalid"),"image/webp"],[Buffer.alloc(0),"image/png"]] as const) await expect(normalizePhoto(input,mime)).rejects.toThrow("PHOTO_INVALID");
    await expect(normalizePhoto(new Uint8Array(3_000_001),"image/png")).rejects.toThrow("PHOTO_TOO_LARGE");
  });
  it("recusa imagem com pixels excessivos ou animação",async () => {
    const huge = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: "white" } }).png().toBuffer();
    await expect(normalizePhoto(huge,"image/png")).rejects.toThrow("PHOTO_INVALID");
    const animated = await sharp(Buffer.from([255,0,0,0,0,255]),{ raw: { width: 1, height: 2, channels: 3, pageHeight: 1 } }).webp().toBuffer();
    expect((await sharp(animated,{ animated: true }).metadata()).pages).toBe(2);
    await expect(normalizePhoto(animated,"image/webp")).rejects.toThrow("PHOTO_INVALID");
  });
});
