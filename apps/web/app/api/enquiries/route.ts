import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const EnquirySchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(200),
  contactName: z.string().trim().min(1, 'Contact name is required').max(200),
  email: z.string().trim().email('Valid email is required').max(200),
  phone: z.string().trim().min(5, 'Phone is required').max(30),
  quantity: z.coerce.number().int().positive().optional(),
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
