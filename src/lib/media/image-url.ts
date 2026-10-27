/** Only paths we create are rendered: /<folder>/<owner uuid>/<file name>. */
const SAFE_PATH = /^\/(avatars|posts)\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,200}$/;

export type ImageTransform = { width: number; height?: number; quality?: number };

/**
 * ImageKit delivery URL with resizing done on the CDN. Returns null for paths
 * that don't match our own storage layout, so arbitrary values never render.
 */
export function imageUrl(endpoint: string, path: string, transform: ImageTransform): string | null {
  if (!SAFE_PATH.test(path)) return null;
  const parts = [`w-${Math.round(transform.width)}`];
  if (transform.height) parts.push(`h-${Math.round(transform.height)}`);
  parts.push(`q-${transform.quality ?? 80}`);
  return `${endpoint.replace(/\/+$/, "")}${path}?tr=${parts.join(",")}`;
}
