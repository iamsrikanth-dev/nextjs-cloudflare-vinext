import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "next-cloudflare",
    template: "%s · next-cloudflare",
  },
  description:
    "Next.js 16 on Cloudflare Workers via vinext — pure SSG with on-demand revalidatePath().",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>
          <p className="muted">
            <Link href="/">next-cloudflare</Link> — SSG + on-demand revalidation
          </p>
          {children}
        </main>
      </body>
    </html>
  );
}
