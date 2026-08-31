import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppWidget } from "@/components/layout/whatsapp-widget";
import { LaunchOfferPopup } from "@/components/layout/launch-offer-popup";

// The same storefront shell as (customer), minus the site-wide Organization /
// WebSite JSON-LD that layout emits. Blog pages carry only their own structured
// data (BlogPosting + FAQPage): the Organization node's postal address and
// phone number read as LocalBusiness markup on article pages, which SEO audits
// flag as unnecessary. The article's publisher is inlined in articleSchema().
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-56px)]">{children}</main>
      <Footer />
      <WhatsAppWidget />
      <LaunchOfferPopup />
    </>
  );
}
