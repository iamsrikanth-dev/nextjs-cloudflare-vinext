import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * On-demand revalidation webhook. Point your CMS "publish" webhook here.
 *
 *   POST /api/revalidate
 *   x-revalidate-secret: <REVALIDATE_SECRET>
 *   { "path": "/blog/hello-world" }        // one path
 *   { "paths": ["/", "/blog/costs"] }      // many paths
 *   { "tag": "posts" }                     // one tag  (needs tagged fetch/cache)
 *   { "tags": ["post:costs", "posts"] }    // many tags
 *
 * `revalidatePath` maps to a Cloudflare edge-cache purge by the route's
 * implicit path tag; `revalidateTag` purges by an explicit tag you attached
 * with `fetch(..., { next: { tags } })`, `unstable_cache`, or `cacheTag()`.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATE_SECRET is not configured" },
      { status: 500 },
    );
  }

  if (request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: {
    path?: string;
    paths?: string[];
    tag?: string;
    tags?: string[];
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const paths = [payload.path, ...(payload.paths ?? [])].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  const tags = [payload.tag, ...(payload.tags ?? [])].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  if (paths.length === 0 && tags.length === 0) {
    return NextResponse.json(
      { ok: false, error: "provide `path`/`paths` and/or `tag`/`tags`" },
      { status: 400 },
    );
  }

  for (const path of paths) revalidatePath(path);
  // Next 16 requires a cacheLife profile as the 2nd arg. On Cloudflare the
  // cdnAdapter purges the edge by tag immediately regardless of the profile;
  // "max" just sets the stale-while-revalidate window for the KV data cache.
  for (const tag of tags) revalidateTag(tag, "max");

  return NextResponse.json({ ok: true, revalidated: { paths, tags }, now: Date.now() });
}
