import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { SessionProvider } from "@/components/auth/session-provider";
import { Providers } from "@/components/providers";
import { auth } from "@/auth";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GiftCraft — India's First Self-Serve Bulk Gifting Platform",
    template: "%s · GiftCraft",
  },
  description:
    "Browse products, build branded gift packs, and get instant transparent pricing. By Arts Shala, Delhi.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>
        <Providers>
          <SessionProvider session={session}>{children}</SessionProvider>
        </Providers>
      </body>
    </html>
  );
}
