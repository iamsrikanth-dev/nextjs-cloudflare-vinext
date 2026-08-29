import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const revalidate = 31_536_000;

// Server Action — runs on the Worker, no client-side secret needed.
async function revalidateEverything(): Promise<void> {
  "use server";
  const posts = await getAllPosts();
  revalidatePath("/");
  for (const post of posts) revalidatePath(`/blog/${post.slug}`);
}

export default function RevalidateDemoPage() {
  const renderedAt = new Date().toISOString();

  return (
    <>
      <p className="muted">
        <Link href="/">← home</Link>
      </p>
      <h1>Revalidation demo</h1>
      <p className="muted">
        This page itself is static (rendered at{" "}
        <span className="stamp">{renderedAt}</span>). The button runs a Server
        Action that calls <code>revalidatePath()</code> for the home page and
        every post, purging them from Cloudflare&apos;s edge cache.
      </p>

      <form action={revalidateEverything}>
        <button type="submit">Revalidate home + all posts</button>
      </form>

      <hr />
      <p className="muted">
        After clicking, open <Link href="/">the home page</Link> or any{" "}
        <Link href="/blog/hello-world">post</Link> and watch its timestamp
        change on the next load.
      </p>
    </>
  );
}
