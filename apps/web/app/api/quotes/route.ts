import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      products,
      packQuantity,
      packaging,
      addons,
      sleeve,
      shippingZone,
      pricing,
      deliveryMode,
      discount,
      logoUrl,
      brandingNotes,
      cardMessage,
      address,
      delivDate,
      pincode,
      csvRecipientCount,
    } = body;

    // Generate unique share token
    const shareToken = nanoid(12);

    // Create quote with payload
    const quote = await prisma.quote.create({
      data: {
        shareToken,
        createdById: session.user.id,
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        payload: {
          products,
          packQuantity,
          packaging,
          addons,
          sleeve,
          shippingZone,
          pricing,
          deliveryMode,
          discount,
          logoUrl: logoUrl || null,
          brandingNotes: brandingNotes || '',
          cardMessage: cardMessage || '',
          // Delivery details (Step 3)
          address: address || null,
          delivDate: delivDate || null,
          pincode: pincode || null,
          csvRecipientCount: csvRecipientCount || 0,
        },
      },
    });

    console.log('✅ Quote created:', quote.id, 'shareToken:', shareToken);

    return NextResponse.json(
      {
        success: true,
        id: quote.id,
        shareToken: quote.shareToken,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating quote:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create quote' },
      { status: 500 }
    );
  }
}
