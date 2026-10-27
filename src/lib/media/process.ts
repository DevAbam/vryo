import sharp from "sharp";

export const AVATAR_SIZE = 512;

/**
 * Re-encodes an avatar to a square WebP. Output carries no EXIF/ICC metadata
 * (sharp drops it unless asked to keep it), so camera GPS data never ships.
 * Throws on undecodable or oversized (decompression-bomb) input.
 */
export async function processAvatar(input: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const buffer = await sharp(input, { limitInputPixels: 40_000_000, failOn: "error" })
    .rotate() // apply EXIF orientation before metadata is dropped
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
    .webp({ quality: 85 })
    .toBuffer();
  return new Uint8Array(buffer);
}
