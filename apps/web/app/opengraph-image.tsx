import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

// Default 1200×630 link preview for every page that doesn't set its own
// og:image (homepage, catalog, packs, blog index, info pages …).
export const runtime = 'nodejs';
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  // Inline the logo as a data URI — ImageResponse can't fetch relative URLs.
  let logoSrc: string | null = null;
  try {
    const logo = await readFile(join(process.cwd(), 'public', 'givoo_logo.png'));
    logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  } catch {
    // Fall back to the text-only card.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #F5F1EB 0%, #FFE4E6 100%)',
        }}
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" width={560} height={191} style={{ objectFit: 'contain' }} />
        ) : (
          <div style={{ fontSize: 110, fontWeight: 900, color: '#800020', display: 'flex' }}>
            {SITE_NAME}
          </div>
        )}
        <div
          style={{
            marginTop: 36,
            fontSize: 34,
            color: '#1A1A1A',
            display: 'flex',
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          {SITE_TAGLINE}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 14,
            background: '#800020',
            display: 'flex',
          }}
        />
      </div>
    ),
    size
  );
}
