# next-cloudflare

Next.js **16.3.3** (App Router) on **Cloudflare Workers** via
[**vinext**](https://github.com/cloudflare/vinext) — **pure SSG** with
**on-demand revalidation** (`revalidatePath()` / `revalidateTag()`).

No Vercel, no Amplify ISR workarounds. The only always-on cost is the
**$5/mo Workers Paid plan** (needed above ~3M requests/mo). No R2, D1, Durable
Objects, or Queues.

---

## How it works

| Piece | What it does |
| --- | --- |
| **vinext** | Runs Next.js on Vite + the Workers runtime. Replaces `next build`. |
| **`prerender: { routes: "*" }`** | Every route is pre-rendered at deploy time → the site ships as SSG. |
| **`export const revalidate = 31_536_000`** | One year, **not `false`**. With `false`, vinext serves a prerendered page's RSC / prefetch variant with a raw `s-maxage` and **no `Cache-Tag`**, so `revalidatePath()` can't purge it — soft `<Link>` navigations stay stale while hard reloads look fresh. A positive `revalidate` routes both the HTML and RSC variants through the tag-aware ISR path. |
| **`cdnAdapter()`** | Page-level ISR is delegated to the **Cloudflare Workers Cache**. Each HTML **and RSC** response is tagged with `Cache-Tag`; the edge serves every HIT with no origin hit. `revalidatePath()` / `revalidateTag()` call `ctx.cache.purge({ tags })` → global [Instant Purge](https://developers.cloudflare.com/cache/how-to/purge-cache/) in ~150ms. |
| **`kvDataAdapter()`** | Origin-side store (Workers KV). The prerender output is uploaded here on deploy, so a cold PoP or a just-purged page is served from KV instead of a full re-render. Also backs `unstable_cache` / `"use cache"`. |
| **`experimental.staleTimes: { static: 0, dynamic: 0 }`** | Disables the App Router's in-memory client Router Cache (default 5 min for static). Without it, a soft navigation shows content up to 5 min stale even after the edge was purged. `0` makes every navigation revalidate against the edge — cheap, because the RSC payload is an edge cache HIT. |
| **`/api/revalidate`** | Secret-protected webhook. Point your CMS "publish" hook at it. |

Request flow:

```
_next/static, /public   ->  Workers static assets      (free, no Worker)
page HTML, edge HIT      ->  Cloudflare PoP cache        (~0 CPU)
page HTML, edge MISS     ->  Worker renders -> KV/edge cache it
POST /api/revalidate     ->  revalidatePath -> purge edge by tag -> next visitor re-renders
```

A prerendered page (both its HTML and its RSC variant) is sent to the edge with
`CDN-Cache-Control: public, max-age=31536000` and a `Cache-Tag` list (e.g.
`_N_T_/blog/hello-world`). It effectively never expires on its own — only an
on-demand purge changes it.

### Freshness after a revalidate

| Access | When it goes fresh |
| --- | --- |
| New visitor / hard reload | Immediately after the purge propagates (~150 ms) |
| Soft `<Link>` navigation | Same — because `staleTimes` is `0`, the client refetches the (now purged) RSC from the edge |
| A tab already showing the page | Not until the user navigates or reloads — nothing live-updates a static page in place |

---

## Local development

```bash
npm install
cp .env.example .dev.vars   # set REVALIDATE_SECRET for local use
npm run dev                  # vinext dev (Vite HMR on the Workers runtime)
```

- `npm run dev` — dev server with HMR
- `npm run build` — production build + prerender
- `npm run preview` — build, then serve the production build locally
- `npm run check` — vinext compatibility report
- `npm run typecheck` — `tsc --noEmit`

> `.dev.vars` feeds `process.env` in the local Workers runtime (via
> `nodejs_compat`). `npm run preview` uses a plain Node server and does **not**
> read `.dev.vars` — prefix it: `REVALIDATE_SECRET=… npm run preview`.

---

## One-time Cloudflare setup

1. **Workers Paid plan** on the account (required for real traffic; Workers
   Cache itself works on any plan).

2. **Create the KV namespace** and paste the id into `wrangler.jsonc`
   (`kv_namespaces[0].id`, and the `env.preview` one if you use previews):

   ```bash
   npx wrangler kv namespace create VINEXT_KV_CACHE
   npx wrangler kv namespace create VINEXT_KV_CACHE --preview   # optional
   ```

3. **Set the revalidation secret** as a Worker secret:

   ```bash
   npx wrangler secret put REVALIDATE_SECRET
   npx wrangler secret put REVALIDATE_SECRET --env preview       # optional
   ```

4. **Set `account_id`** in `wrangler.jsonc`, or export `CLOUDFLARE_ACCOUNT_ID`.

5. **GitHub Actions** (`.github/workflows/deploy.yml`) — add repo secrets:
   - `CLOUDFLARE_API_TOKEN` — "Edit Cloudflare Workers" token template
   - `CLOUDFLARE_ACCOUNT_ID`

---

## Deploy

```bash
npm run deploy            # production
npm run deploy:preview    # -> env.preview (separate Worker + KV namespace)
```

`vinext-cloudflare deploy` builds, pre-renders every route, uploads the
prerender cache to KV, then runs `wrangler deploy`. **Deploy from CI**, not from
a laptop — local deploys can ship mismatched bundle hashes. Push to `main` and
the workflow does it.

Optional flags:

- `--experimental-warm-cdn-cache` — fetch every prerendered path right after
  deploy so the edge is warm before real traffic arrives.
- `--experimental-tpr` — Traffic-aware Pre-Rendering: only prerender the pages
  that actually get traffic (needs a custom domain + Zone Analytics token).

---

## Testing on-demand revalidation

Every page prints the timestamp of its last render. Reload → it stays frozen
(served from cache). Revalidate → it jumps on the next load.

**Via the webhook** (what your CMS calls):

```bash
SITE=https://your-worker.example.workers.dev
SECRET=...   # the REVALIDATE_SECRET you set

curl -X POST "$SITE/api/revalidate" \
  -H "content-type: application/json" \
  -H "x-revalidate-secret: $SECRET" \
  -d '{"path":"/blog/hello-world"}'

# multiple paths / tags
curl -X POST "$SITE/api/revalidate" \
  -H "content-type: application/json" \
  -H "x-revalidate-secret: $SECRET" \
  -d '{"paths":["/","/blog/costs"],"tags":["posts"]}'
```

**Via the UI** — open `/revalidate-demo` and click the button (a Server Action
that calls `revalidatePath()` directly; no secret needed).

`revalidateTag` only affects data you explicitly tagged — e.g.
`fetch(url, { next: { tags: ["posts"] } })` or `unstable_cache(fn, keys, { tags })`.
The sample data layer (`lib/posts.ts`) is a plain module, so use `path` for it.

---

## Swapping in a real CMS

Replace `getAllPosts` / `getPost` in [`lib/posts.ts`](lib/posts.ts) with
`fetch()` calls. Tag them so `revalidateTag` works:

```ts
const res = await fetch(`${CMS}/posts/${slug}`, {
  next: { tags: ["posts", `post:${slug}`] },
});
```

Then a CMS webhook can send `{"tags":["post:hello-world"]}` to refresh exactly
one post everywhere.

---

## Costs

| Item | Cost |
| --- | --- |
| Workers Paid base (10M req + 30M CPU-ms incl.) | $5.00/mo |
| Extra requests (edge HITs = request rate, **0 CPU**) | ~$0.30 / million |
| Cache-miss renders after purges (CPU-ms) | usually within the included quota |
| Workers KV (prerender cache) | free tier covers most sites |
| Static assets + bandwidth | $0 |
| **R2 / D1 / Durable Objects / Queues** | **not used** |

---

## Limitations (vinext is beta)

- **Image optimization is off.** `images.unoptimized = true`; `next/image` still
  renders (local images as-is, remote via the source CDN). Enable Cloudflare
  Images later:
  `npx vinext init --platform=cloudflare --image-optimization=cloudflare-images`.
- **`cacheComponents` / PPR** is partially implemented — don't rely on it. Keep
  `enableCacheInterception`-style tricks out; this setup doesn't need them.
- **No `output: "export"`**, no `export const runtime = "edge"` (ignored).
- **Build system is Vite**, not Turbopack/webpack — custom webpack config, and
  `next/jest`, don't apply. Use Vite plugins / Vitest.
- Re-run `npm run check` on every `vinext` upgrade. Keep your previous host warm
  for a fast DNS rollback during the first weeks in production.
- `next` is a dependency only for authoritative TypeScript types — vinext shims
  every `next/*` import at build time.

---

## File map

```
vite.config.ts              vinext + cloudflare plugin + cache adapters
wrangler.jsonc              Worker config: cache, KV, assets, preview env
next.config.ts              images.unoptimized; notes on what NOT to add
app/
  layout.tsx               root layout
  page.tsx                 static index, lists posts, shows render time
  blog/[slug]/page.tsx     SSG via generateStaticParams, revalidate = false
  revalidate-demo/page.tsx Server Action that calls revalidatePath()
  api/revalidate/route.ts  secret-protected revalidation webhook
lib/posts.ts               mock CMS — swap for real fetch()
.github/workflows/deploy.yml  CI deploy to Workers
.dev.vars                  local secrets (git-ignored)
```
