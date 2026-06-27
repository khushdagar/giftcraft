import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Sensible defaults so the contact page always renders, even before an admin
// sets the `contact` PlatformSetting.
const DEFAULTS = {
  email: 'hello@giftcraft.in',
  phone: '+91 98765 43210',
  whatsapp: '919876543210', // digits only, used for wa.me links
};

/**
 * GET /api/settings/contact
 * Public contact details, sourced from the `contact` PlatformSetting with
 * fallback to defaults.
 */
export async function GET() {
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: 'contact' } });
    const v = (row?.value as any) || {};
    return NextResponse.json({
      email: v.email || DEFAULTS.email,
      phone: v.phone || DEFAULTS.phone,
      whatsapp: v.whatsapp || DEFAULTS.whatsapp,
    });
  } catch (error) {
    console.error('Error fetching contact settings:', error);
    return NextResponse.json(DEFAULTS);
  }
}
