import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pure SSG + on-demand revalidation.
  //
  //  - Do NOT set `output: "export"` — a static export has no server and cannot
  //    honour `revalidatePath()` / `revalidateTag()`.
  //  - Do NOT add `export const runtime = "edge"` to routes — vinext runs the
  //    whole app on the Workers runtime already and ignores that directive.
  //
  // Image optimization is intentionally left off (see README). `next/image`
  // still works — local images are served as-is, remote images go through the
  // source CDN via @unpic/react. Turn on Cloudflare Images later with
  // `vinext init --platform=cloudflare --image-optimization=cloudflare-images`.
  images: {
    unoptimized: true,
  },

  experimental: {
    // The App Router keeps prefetched RSC payloads in an in-memory client
    // cache. The default (`static: 300`) means a soft <Link> navigation shows
    // content up to 5 minutes stale even after `revalidatePath()` purged the
    // edge — only a hard reload looks fresh. `0` makes every navigation
    // revalidate against the edge (which is cheap: the RSC payload is an edge
    // cache HIT, ~0 CPU). Raise this if you want the snappier cached-nav feel
    // and can tolerate a staleness window.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
