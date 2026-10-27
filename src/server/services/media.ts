import "server-only";
import { AppError } from "@/lib/errors";
import { processAvatar } from "@/lib/media/process";
import { MAX_IMAGE_BYTES, sniffImageType } from "@/lib/media/sniff";
import { logger } from "@/lib/observability/logger";
import {
  deleteFile,
  getFilePath,
  imagekitConfigured,
  uploadPublicImage,
  type StoredFile,
} from "@/server/providers/media/imagekit";

const avatarFolder = (userId: string) => `/avatars/${userId}`;

/**
 * Validates and re-encodes an avatar, then stores it in the user's own folder.
 * Re-encoding strips EXIF (including GPS location) and defuses malformed files.
 */
export async function storeAvatar(userId: string, file: File): Promise<StoredFile> {
  if (!imagekitConfigured()) {
    throw new AppError("DEPENDENCY_UNAVAILABLE", {
      message: "Photo uploads aren't available yet.",
    });
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new AppError("VALIDATION_FAILED", { message: "Choose an image under 4 MB." });
  }
  const input = new Uint8Array(await file.arrayBuffer());
  if (!sniffImageType(input)) {
    throw new AppError("VALIDATION_FAILED", { message: "Use a JPEG, PNG or WebP image." });
  }

  let output: Uint8Array<ArrayBuffer>;
  try {
    output = await processAvatar(input);
  } catch {
    throw new AppError("VALIDATION_FAILED", { message: "That image couldn't be read." });
  }

  const folder = avatarFolder(userId);
  let stored;
  try {
    stored = await uploadPublicImage({
      bytes: output,
      folder,
      fileName: "avatar.webp",
      tags: ["avatar"],
    });
  } catch (error) {
    logger.error("media.avatar_upload_failed", { userId, error });
    throw new AppError("DEPENDENCY_UNAVAILABLE", { message: "Upload failed. Please try again." });
  }

  if (!stored.filePath.startsWith(`${folder}/`)) {
    // Defensive: never record a path outside the user's folder.
    await deleteFile(stored.fileId).catch(() => undefined);
    throw new AppError("INTERNAL");
  }
  return stored;
}

/**
 * Deletes a replaced or removed avatar. The file id comes from the database,
 * which the user can write, so ImageKit is asked where the file lives and it is
 * only deleted if it is inside this user's own avatar folder. Never throws:
 * the profile change already succeeded, and leftovers are a storage cost only.
 */
export async function deleteOldAvatar(userId: string, fileId: string | null): Promise<void> {
  if (!fileId || !imagekitConfigured()) return;
  try {
    const path = await getFilePath(fileId);
    if (!path) return;
    if (!path.startsWith(`${avatarFolder(userId)}/`)) {
      logger.warn("media.avatar_delete_refused", { userId, fileId });
      return;
    }
    await deleteFile(fileId);
  } catch (error) {
    logger.error("media.avatar_delete_failed", { userId, fileId, error });
  }
}
