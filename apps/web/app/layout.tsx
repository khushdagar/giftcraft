import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { SessionProvider } from "@/components/auth/session-provider";
import { Providers } from "@/components/providers";
import { GoogleTagManager, GoogleTagManagerNoScript } from "@/components/analytics/gtm";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, SITE_NOINDEX } from "@/lib/site";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // No title template: page titles are used exactly as each page sets them.
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "./" },
  // Site-wide kill switch (SITE_NOINDEX=true). Inherited by every page that
  // doesn't set its own `robots`, so one env var hides the whole site.
  //
  // When indexable we emit the tag EXPLICITLY rather than relying on the
  // implicit "no tag == index, follow" default. Same result for Google, but
  // auditors/SEO tools report "robots meta tag is not defined" otherwise, and
  // the googleBot block is the part that actually matters: without it Google
  // truncates snippets and caps image previews on rich results.
  robots: SITE_NOINDEX
    ? { index: false, follow: false }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-snippet": -1,
          "max-image-preview": "large",
          "max-video-preview": -1,
        },
      },
  // No title/description/url here on purpose. Pages that set only `title` and
  // `description` inherit this whole block, and Next fills og:title /
  // og:description from the PAGE's own title when they're absent — whereas a
  // value set here would make every such page share as the homepage.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION (and optionally the Bing one) in
  // the production environment; omitted from the HTML when unset.
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
      : {}),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#800020",
};

// NOT async, and deliberately does NOT call auth(). Reading the session here
// reads cookies, which opts EVERY route in the app out of static/ISR rendering
// - the `export const revalidate = 3600` on the storefront pages was dead while
// this layout awaited auth(), so every page view was rendered on demand with a
// database round-trip in front of it. SessionProvider resolves the session on
// the client instead (/api/auth/session); Navbar and CartSessionGuard both
// already handle the "loading" state.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${dmSans.variable} ${playfair.variable}`}>
      <head>
        <GoogleTagManager />
      </head>
      <body>
        {/* GTM's no-JS fallback — must be the first thing inside <body>. */}
        <GoogleTagManagerNoScript />
        {/* Site-wide Organization / WebSite JSON-LD lives in app/(customer)/layout.tsx
            so the blog route group can opt out of it. */}
        <Providers>
          <SessionProvider>{children}</SessionProvider>
        </Providers>
      </body>
    </html>
  );
}
