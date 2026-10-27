/** Largest accepted image upload. Keeps uploads under typical serverless body limits. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type ImageKind = "jpeg" | "png" | "webp";

/**
 * Detects the real image type from magic bytes. Never trust the browser's MIME
 * type or the file extension. SVG and GIF are deliberately unsupported.
 */
export function sniffImageType(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((byte, i) => bytes[i] === byte)) return "png";
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}
