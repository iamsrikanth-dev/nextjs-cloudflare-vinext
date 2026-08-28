/**
 * Stand-in for your CMS / database.
 *
 * Replace `getAllPosts` / `getPost` with real `fetch()` calls to your content
 * source. Nothing about the caching or revalidation wiring changes — the pages
 * stay statically generated and `revalidatePath()` still invalidates them.
 *
 * If you switch to `fetch()`, tag the requests so `revalidateTag()` works too:
 *
 *   const res = await fetch(`${CMS}/posts/${slug}`, {
 *     next: { tags: ["posts", `post:${slug}`] },
 *   });
 */

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
};

const POSTS: Post[] = [
  {
    slug: "hello-world",
    title: "Hello, world",
    excerpt: "The first post. Statically generated, revalidated on demand.",
    body: "This page was rendered once at build time and pushed to Cloudflare's edge cache. It will keep serving from the edge — with zero origin hits — until a `revalidatePath('/blog/hello-world')` call purges it.",
    author: "Ada",
  },
  {
    slug: "how-caching-works",
    title: "How caching works here",
    excerpt: "cdnAdapter tags each response; revalidatePath purges by tag.",
    body: "Every prerendered response carries a `Cache-Tag` header. On-demand revalidation calls `ctx.cache.purge({ tags })` under the hood, which propagates globally through Cloudflare Instant Purge in ~150ms. The next visitor triggers a fresh render; everyone after that gets the new edge-cached copy.",
    author: "Grace",
  },
  {
    slug: "costs",
    title: "What this costs",
    excerpt: "Workers Paid $5/mo floor. No R2, D1, Durable Objects, or Queues.",
    body: "Static assets are free and unlimited. Cache HITs bill at the request rate with no CPU charge. The only always-on cost is the $5/mo Workers Paid plan (needed above ~3M requests/mo). KV usage for the prerender cache stays inside the free tier for most sites.",
    author: "Linus",
  },
  {
    slug: "going-to-production",
    title: "Going to production",
    excerpt: "Run vinext check, deploy from CI, keep a rollback.",
    body: "vinext is beta and reimplements Next.js on Vite. Run `vinext check` on every upgrade, deploy only from CI so bundle hashes stay consistent, and keep your previous host warm for a fast DNS rollback during the first weeks.",
    author: "Margaret",
  },
];

// Simulate async I/O so this is a drop-in seam for a real fetch().
export async function getAllPosts(): Promise<Post[]> {
  return POSTS;
}

export async function getPost(slug: string): Promise<Post | undefined> {
  return POSTS.find((post) => post.slug === slug);
}
