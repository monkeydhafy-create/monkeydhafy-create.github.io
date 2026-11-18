import { createHash } from "node:crypto";
import { defineConfig } from "vite";

const buildAssetHash = createHash("sha256")
  .update(`${Date.now()}-${process.env.GITHUB_SHA ?? "local"}`)
  .digest("hex")
  .slice(0, 8);

// https://vite.dev/config/
export default defineConfig({
  // Relative URLs so the build works from any folder, e.g. GitHub Pages
  base: "./",
  define: {
    __APP_BUILD_HASH__: JSON.stringify(buildAssetHash),
  },
  plugins: [
    {
      name: "append-asset-hash-html",
      transformIndexHtml(html) {
        return html.replace(
          /(href|src)="(\.?\/(?:favicon\.svg|assets\/world\/[^"?]+))"/g,
          `$1="$2?v=${buildAssetHash}"`,
        );
      },
    },
  ],
  server: {
    port: 8080,
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
