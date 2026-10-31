import Image from "next/image";

/**
 * The GIVOO logo image. Used everywhere the text wordmark used to appear. The
 * source has a solid off-white background, so on dark surfaces pass `rounded-md`
 * (or similar) to render it as a clean chip. This is a WebP resized for the
 * header; givoo_logo.png stays for emails and PDFs, which can't take WebP.
 */
export function BrandLogo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/givoo_logo.webp"
      alt="GIVOO"
      width={514}
      height={235}
      priority
      className={className}
    />
  );
}
