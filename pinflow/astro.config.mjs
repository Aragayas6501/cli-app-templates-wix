// @ts-check
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import wix from "@wix/astro";
import react from "@astrojs/react";
import cloudProviderFetchAdapter from "@wix/cloud-provider-fetch-adapter";

const isBuild = process.argv.includes("build");

export default defineConfig({
  output: "server",
  integrations: [wix(), react()],
  image: { domains: ["static.wixstatic.com", "i.pinimg.com"] },
  security: { checkOrigin: false },
  devToolbar: { enabled: false },
  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        backend: fileURLToPath(new URL("./src/backend", import.meta.url)),
      },
    },
  },
  ...(isBuild && { adapter: cloudProviderFetchAdapter({}) }),
});
