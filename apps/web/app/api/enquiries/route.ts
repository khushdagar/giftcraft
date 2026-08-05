import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { zEmail, zPersonName, zPhone } from '@/lib/zod-fields';
import { sendPushToAdmins } from '@/lib/push';

const EnquirySchema = z.object({
  companyName: zPersonName('Company name').max(200),
  contactName: zPersonName('Contact name').max(200),
  email: zEmail,
  phone: zPhone,
  quantity: z.coerce.number().int().positive().max(1000000).optional(),
  message: z.string().trim().max(2000).optional(),
  productId: z.string().optional(),
  productName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = EnquirySchema.parse(body);

    const enquiry = await prisma.enquiry.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        quantity: data.quantity ?? null,
        message: data.message || null,
        productId: data.productId || null,
        productName: data.productName || null,
      },
      select: { id: true },
    });

    // Leads go cold fast — alert admins immediately. Tag matches the bell's
    // enquiry-<id> key so the two don't stack up.
    sendPushToAdmins({
      title: `New enquiry from ${data.companyName}`,
      body: data.productName
        ? `About ${data.productName}${data.quantity ? ` — ${data.quantity} units` : ''}`
        : `${data.contactName} — ${data.phone}`,
      url: '/admin/enquiries',
      tag: `enquiry-${enquiry.id}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: { id: enquiry.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }
    console.error('Error creating enquiry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit enquiry' },
      { status: 500 }
    );
  }
}
