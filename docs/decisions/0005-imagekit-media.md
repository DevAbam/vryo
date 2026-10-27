# 0005 — ImageKit for user images

- Status: accepted
- Date: 2026-10-28

## Context

Profile photos now, post images in Phase 2. We need a CDN with on-the-fly resizing. The product owner chose ImageKit over Supabase Storage.

## Decision

- **Upload path:** browser → server action → validate → re-encode with `sharp` → ImageKit upload API (official `@imagekit/nodejs` SDK) using the server-only private key. The server chooses the folder (`/avatars/<user id>/`) and file name, so clients can't write anywhere else or overwrite files.
- **Validation:** size ≤ 4 MB; real type sniffed from magic bytes (JPEG/PNG/WebP only; no SVG or GIF); decoded with a pixel limit against decompression bombs; re-encoded to WebP, which strips EXIF/GPS and neutralises polyglot files.
- **Storage reference:** the database stores the ImageKit file _path_, never a URL. A check constraint restricts `profiles.avatar_path` to the owner's own folder.
- **Delivery:** `https://<endpoint><path>?tr=w-…,h-…,q-…` from ImageKit's CDN, built only for paths that match our layout. Plain `<img>` (not `next/image`) to avoid optimising twice.
- **Optional until configured:** without `IMAGEKIT_PRIVATE_KEY` and `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`, the upload UI is hidden and avatars fall back to initials.

## Consequences

- Upload bytes pass through our server (small, bounded). That's acceptable for avatars and post images. Large media such as video would need ImageKit's signed client-side upload instead.
- The profile stores the ImageKit `fileId`; replacing or removing an avatar deletes the old file after confirming with ImageKit that it lives in the owner's folder. A failed delete only leaves an orphan (logged).
- Private media (chat attachments, Phase 3) will use `isPrivateFile` with short-lived signed URLs, not this public path.
