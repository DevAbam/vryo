import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { imageUrl } from "@/lib/media/image-url";
import { AVATAR_SIZE, processAvatar } from "@/lib/media/process";
import { sniffImageType } from "@/lib/media/sniff";

const USER = "3f1c2b9e-1d2a-4c5b-8e9f-0a1b2c3d4e5f";
const ENDPOINT = "https://ik.imagekit.io/vyro";

describe("sniffImageType", () => {
  it("detects real JPEG, PNG and WebP bytes", async () => {
    const base = sharp({ create: { width: 4, height: 4, channels: 3, background: "#adff2f" } });
    expect(sniffImageType(await base.clone().jpeg().toBuffer())).toBe("jpeg");
    expect(sniffImageType(await base.clone().png().toBuffer())).toBe("png");
    expect(sniffImageType(await base.clone().webp().toBuffer())).toBe("webp");
  });

  it("rejects SVG, GIF, HTML and empty input regardless of claimed type", () => {
    const text = (s: string) => new TextEncoder().encode(s);
    expect(sniffImageType(text('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'))).toBe(
      null,
    );
    expect(sniffImageType(text("GIF89a...."))).toBe(null);
    expect(sniffImageType(text("<html><body>hi</body></html>"))).toBe(null);
    expect(sniffImageType(new Uint8Array())).toBe(null);
  });
});

describe("processAvatar", () => {
  it("outputs a square WebP with EXIF (including GPS) removed", async () => {
    const withExif = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#123456" },
    })
      .jpeg()
      .withExif({ IFD0: { Make: "PhoneMaker", Model: "SecretPhone" } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();

    const output = await processAvatar(withExif);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(AVATAR_SIZE);
    expect(meta.height).toBe(AVATAR_SIZE);
    expect(meta.exif).toBeUndefined();
    expect(Buffer.from(output).includes("SecretPhone")).toBe(false);
  });

  it("rejects bytes that only look like an image", async () => {
    const fake = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02, 0x03]);
    await expect(processAvatar(fake)).rejects.toThrow();
  });
});

describe("imageUrl", () => {
  it("builds a resized CDN URL for our own paths", () => {
    expect(
      imageUrl(`${ENDPOINT}/`, `/avatars/${USER}/avatar_Ab12.webp`, { width: 80, height: 80 }),
    ).toBe(`${ENDPOINT}/avatars/${USER}/avatar_Ab12.webp?tr=w-80,h-80,q-80`);
  });

  it.each([
    "https://evil.example/x.png",
    "/avatars/not-a-uuid/a.webp",
    `/avatars/${USER}/../../secret.png`,
    `/other/${USER}/a.webp`,
    `/avatars/${USER}/a.webp?tr=x`,
  ])("refuses path %s", (path) => {
    expect(imageUrl(ENDPOINT, path, { width: 40 })).toBeNull();
  });
});
