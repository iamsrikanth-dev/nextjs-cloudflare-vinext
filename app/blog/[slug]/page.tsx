import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPosts, getPost } from "@/lib/posts";

// SSG: `generateStaticParams` prerenders every post at deploy time.
//
// `revalidate` is set to one year rather than `false`. With `false`, vinext
// serves the RSC/prefetch variant of a prerendered page with a raw
// `s-maxage=31536000` and NO `Cache-Tag`, so `revalidatePath()` cannot purge
// it from the edge — soft (<Link>) navigations then show stale content while a
// hard reload shows fresh. A positive `revalidate` routes the page through the
// tag-aware ISR path so BOTH the HTML and RSC variants are edge-cached *with*
// the path tag and get purged together. One year ≈ "on-demand only" in
// practice; the webhook is what actually refreshes content.
export const revalidate = 31_536_000;
export const dynamicParams = true; // new slugs render on first request, then cache

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return post ? { title: post.title, description: post.excerpt } : {};
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const renderedAt = new Date().toISOString();

  return (
    <>
      <p className="muted">
        <Link href="/">← all posts</Link>
      </p>
      <h1>{post.title}</h1>
      <p className="muted">by {post.author}</p>
      <p>{post.body}</p>

      <hr />
      <p className="stamp">rendered at {renderedAt}</p>
      <p className="muted">
        Reload — the timestamp stays frozen (served from the edge cache). Then
        run:
      </p>
      <pre>
        {`curl -X POST "$SITE/api/revalidate" \\
  -H "content-type: application/json" \\
  -H "x-revalidate-secret: $REVALIDATE_SECRET" \\
  -d '{"path":"/blog/${post.slug}"}'`}
      </pre>
      <p className="muted">
        …reload again and the timestamp jumps — the page was purged and
        re-rendered.
      </p>
    </>
  );
}
