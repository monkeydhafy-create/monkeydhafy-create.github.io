export const BUILD_ASSET_HASH: string =
  typeof __APP_BUILD_HASH__ === "string" && __APP_BUILD_HASH__.length > 0
    ? __APP_BUILD_HASH__
    : "dev";

/**
 * Appends the current build hash (`?v=<hash>`) to static asset URLs so
 * browsers and CDNs (Cloudflare / GitHub Pages) never serve stale files
 * across deploys. Skips data:/blob: URLs and URLs already tagged with `v=`.
 */
export function withAssetHash(url: string): string {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (/[?&]v=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${BUILD_ASSET_HASH}`;
}

/**
 * Appends a unique per-request cache-busting hash (`&_v=<buildHash>-<ts>`)
 * to live GET API endpoints (e.g. weather feeds).
 */
export function withFreshBust(url: string): string {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_v=${BUILD_ASSET_HASH}-${Date.now().toString(36)}`;
}
