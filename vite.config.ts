import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // Relative URLs so the build works from any folder, e.g. GitHub Pages
  base: "./",
  server: {
    port: 8080,
    open: true,
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            {
              name: "vendor-pixi",
              test: /node_modules[\\/](?:pixi\.js|@pixi)[\\/]/,
              maxSize: 320_000,
              priority: 20,
            },
            {
              name: "vendor-misc",
              test: /node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
