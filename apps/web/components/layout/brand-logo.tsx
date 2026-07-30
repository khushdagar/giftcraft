import Image from "next/image";

/**
 * The GIVOO logo image (/public/givoo_logo.png, 514×235). Used everywhere the
 * text wordmark used to appear. The source PNG has a solid off-white
 * background, so on dark surfaces pass `rounded-md` (or similar) to render it
 * as a clean chip.
 */
export function BrandLogo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/givoo_logo.png"
      alt="GIVOO"
      width={514}
      height={235}
      priority
      className={className}
    />
  );
}
