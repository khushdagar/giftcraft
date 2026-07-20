import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { SessionProvider } from "@/components/auth/session-provider";
import { Providers } from "@/components/providers";
import { auth } from "@/auth";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GiftCraft — India's First Self-Serve Bulk Gifting Platform",
    template: "%s · GiftCraft",
  },
  description:
    "Browse products, build branded gift packs, and get instant transparent pricing. By GiftCraft, Delhi.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en" className={`${roboto.variable}`}>
      <body>
        <Providers>
          <SessionProvider session={session}>{children}</SessionProvider>
        </Providers>
      </body>
    </html>
  );
}
