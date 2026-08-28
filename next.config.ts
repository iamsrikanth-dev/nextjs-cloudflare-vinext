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
};

export default nextConfig;
