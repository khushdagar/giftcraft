import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { SessionProvider } from "@/components/auth/session-provider";
import { Providers } from "@/components/providers";
import { JsonLd } from "@/components/seo/json-ld";
import { GoogleTagManager, GoogleTagManagerNoScript } from "@/components/analytics/gtm";
import { organizationSchema, webSiteSchema } from "@/lib/schema";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, SITE_NOINDEX } from "@/lib/site";
import { auth } from "@/auth";
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
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "./" },
  // Site-wide kill switch (SITE_NOINDEX=true). Inherited by every page that
  // doesn't set its own `robots`, so one env var hides the whole site.
  ...(SITE_NOINDEX ? { robots: { index: false, follow: false } } : {}),
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <head>
        <GoogleTagManager />
      </head>
      <body>
        {/* GTM's no-JS fallback — must be the first thing inside <body>. */}
        <GoogleTagManagerNoScript />
        {/* Site-wide structured data — server-rendered in the initial HTML. */}
        <JsonLd data={organizationSchema()} />
        <JsonLd data={webSiteSchema()} />
        <Providers>
          <SessionProvider session={session}>{children}</SessionProvider>
        </Providers>
      </body>
    </html>
  );
}
