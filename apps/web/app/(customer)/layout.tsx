import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppWidget } from "@/components/layout/whatsapp-widget";
import { LaunchOfferPopup } from "@/components/layout/launch-offer-popup";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationSchema, webSiteSchema } from "@/lib/schema";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Site-wide structured data for the storefront — server-rendered in the
          initial HTML. Lives here rather than in the root layout so the blog
          (its own route group) doesn't inherit the Organization node. */}
      <JsonLd data={organizationSchema()} />
      <JsonLd data={webSiteSchema()} />
      <Navbar />
      <main className="min-h-[calc(100vh-56px)]">{children}</main>
      <Footer />
      <WhatsAppWidget />
      <LaunchOfferPopup />
    </>
  );
}
