import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppWidget } from "@/components/layout/whatsapp-widget";
import { LaunchOfferPopup } from "@/components/layout/launch-offer-popup";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-56px)]">{children}</main>
      <Footer />
      <WhatsAppWidget />
      {/* <LaunchOfferPopup /> */}
    </>
  );
}
