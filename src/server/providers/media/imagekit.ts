import "server-only";
import ImageKit from "@imagekit/nodejs";
import { z } from "zod";

const schema = z.object({
  IMAGEKIT_PRIVATE_KEY: z.string().min(10),
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: z.url(),
});

/** ImageKit is optional until configured; upload UI hides when it isn't. */
export function imagekitConfigured(): boolean {
  return schema.safeParse(process.env).success;
}

let client: ImageKit | undefined;

function getClient(): ImageKit {
  if (client) return client;
  const env = schema.parse(process.env);
  client = new ImageKit({ privateKey: env.IMAGEKIT_PRIVATE_KEY, timeout: 15_000, maxRetries: 1 });
  return client;
}

export type StoredFile = { fileId: string; filePath: string };

/**
 * Server-side upload with a fixed folder and server-chosen file name. The
 * private key never leaves the server and clients can't choose where files go.
 */
export async function uploadPublicImage(input: {
  bytes: Uint8Array<ArrayBuffer>;
  folder: string;
  fileName: string;
  tags: string[];
}): Promise<StoredFile> {
  const response = await getClient().files.upload({
    file: new File([input.bytes], input.fileName),
    fileName: input.fileName,
    folder: input.folder,
    useUniqueFileName: true,
    overwriteFile: false,
    isPrivateFile: false,
    tags: input.tags,
  });
  if (!response.fileId || !response.filePath) {
    throw new Error("ImageKit upload returned no file id or path");
  }
  return { fileId: response.fileId, filePath: response.filePath };
}

/** Path of a stored file, or null if it no longer exists. */
export async function getFilePath(fileId: string): Promise<string | null> {
  try {
    const file = await getClient().files.get(fileId);
    return file.filePath ?? null;
  } catch (error) {
    if (error instanceof ImageKit.NotFoundError) return null;
    throw error;
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  await getClient().files.delete(fileId);
}
