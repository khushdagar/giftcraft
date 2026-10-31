'use client';

import type { ImgHTMLAttributes } from 'react';
import { cdnSrcSet, clearSrcSetOnError } from '@/lib/cdn-srcset';

type CdnImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> & { src: string };

// A server-rendered image can fail before hydration, when onError isn't attached
// yet. Re-applying srcset retries it so the error fires again. Don't clear srcset
// here: Chrome also reports lazy images it hasn't started as complete with no
// width, and those must keep their variants.
function retryIfBroken(img: HTMLImageElement | null) {
  if (img?.complete && img.naturalWidth === 0 && img.srcset) img.setAttribute('srcset', img.srcset);
}

/**
 * An <img> that picks a right-sized CDN variant (see lib/cdn-srcset.ts) and
 * falls back to the primary `src` when a variant doesn't exist. Pass `sizes`
 * matching the rendered width. Lazy by default; pass loading="eager" for
 * above-the-fold images.
 */
export function CdnImg({ src, alt = '', loading = 'lazy', decoding = 'async', ...rest }: CdnImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={retryIfBroken}
      src={src}
      srcSet={cdnSrcSet(src)}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={clearSrcSetOnError}
      {...rest}
    />
  );
}
