"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The form only downloads for visitors who are actually about to see it.
const LaunchOfferDialog = dynamic(
  () => import("./launch-offer-dialog").then((m) => m.LaunchOfferDialog),
  { ssr: false }
);

// Bumped key: visitors who dismissed the old coupon popup should still see the
// new enquiry form once.
const STORAGE_KEY = "givoo_enquiry_popup_seen";
const DELAY_MS = 3000;

// The delay starts at the visitor's first interaction, not on page load. A
// full-screen overlay that appears on its own covers the page while the visitor
// is still reading, and as the last visual change it pushes Speed Index out to
// whenever it lands.
const INTERACTION_EVENTS = ["scroll", "pointerdown", "pointermove", "keydown", "touchstart"] as const;

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function LaunchOfferPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // Private mode / storage blocked — still show the popup once per page.
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const stopListening = () =>
      INTERACTION_EVENTS.forEach((name) => window.removeEventListener(name, onInteract));
    function onInteract() {
      stopListening();
      timer = setTimeout(() => setOpen(true), DELAY_MS);
    }

    INTERACTION_EVENTS.forEach((name) =>
      window.addEventListener(name, onInteract, { passive: true })
    );
    return () => {
      stopListening();
      clearTimeout(timer);
    };
  }, []);

  if (!open) return null;

  return <LaunchOfferDialog onSeen={markSeen} onClose={() => setOpen(false)} />;
}
