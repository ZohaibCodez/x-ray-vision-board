// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Deploying to Vercel (static SPA):
//   - cloudflare: false  → disables @cloudflare/vite-plugin so no Cloudflare Workers bundle is produced
//   - spa.enabled: true  → TanStack Start pre-renders an index.html shell; app runs fully client-side
//   Output lands in dist/client/ — served by Vercel with SPA rewrites (see vercel.json).
//
// To redeploy to Cloudflare Workers instead, swap back to:
//   cloudflare: true (or remove the key), tanstackStart: { server: { entry: "server" } }
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    spa: {
      enabled: true,
    },
  },
});
