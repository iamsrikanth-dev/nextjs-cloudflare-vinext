import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";

export default defineConfig({
  plugins: [
    vinext({
      // Pre-render every route at deploy time -> the site ships as SSG.
      prerender: { routes: "*" },

      cache: {
        // Page-level ISR is delegated to the Cloudflare Workers Cache.
        // The origin renders fresh HTML, tags it with `Cache-Tag`, and the
        // edge serves every subsequent HIT without touching the Worker.
        // `revalidatePath()` / `revalidateTag()` purge the edge by tag.
        // Requires `"cache": { "enabled": true }` in wrangler.jsonc.
        cdn: cdnAdapter(),

        // Origin-side store for prerendered pages + `unstable_cache` /
        // `"use cache"`. Prerendered output is uploaded here on deploy, so a
        // cold PoP or a just-purged page is served from KV instead of a full
        // re-render. Binding: VINEXT_KV_CACHE (see wrangler.jsonc).
        data: kvDataAdapter(),
      },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
