import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

// SSG: rendered at build, cached at the edge until `revalidatePath('/')`.
// One year rather than `false` so the RSC/prefetch variant is edge-cached
// *with* the path tag and stays purgeable — see app/blog/[slug]/page.tsx.
export const revalidate = 31_536_000;

export default async function HomePage() {
  const posts = await getAllPosts();
  const renderedAt = new Date().toISOString();

  return (
    <>
      <h1>Blog</h1>
      <p className="muted">
        Every page below is statically generated and served from Cloudflare's
        edge cache. Publish a change by calling the revalidation webhook — no
        rebuild, no redeploy.
      </p>

      <p className="stamp">this list rendered at {renderedAt}</p>

      {posts.map((post) => (
        <Link key={post.slug} href={`/blog/${post.slug}`} className="card">
          <strong>{post.title}</strong>
          <br />
          <span className="muted">{post.excerpt}</span>
        </Link>
      ))}

      <hr />
      <p className="muted">
        Try it: <Link href="/revalidate-demo">open the revalidation demo</Link>{" "}
        or POST to <code>/api/revalidate</code> (see the README).
      </p>
    </>
  );
}
