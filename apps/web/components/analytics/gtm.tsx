import Script from "next/script";

/**
 * Google Tag Manager.
 *
 * The container id defaults to the production container but can be overridden
 * per-environment with NEXT_PUBLIC_GTM_ID — set it to an empty string in dev or
 * preview to stop local traffic landing in production analytics.
 */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-PCL55MFX";

/**
 * The GTM loader. `afterInteractive` is Next's recommended strategy for tag
 * managers: it runs once the page is interactive rather than blocking the
 * initial render, while still firing early enough for pageview tracking.
 */
export function GoogleTagManager() {
  if (!GTM_ID) return null;
  return (
    <Script id="gtm-init" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}

/**
 * The no-JavaScript fallback. Must sit immediately inside <body> — GTM's own
 * snippet requires it there, and it is inert when scripting is available.
 */
export function GoogleTagManagerNoScript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
