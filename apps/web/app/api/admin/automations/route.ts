import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  trigger: z.enum([
    'order_placed',
    'order_confirmed',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'dispute_opened',
    'quote_created',
    'quote_expired',
    'payment_received',
    'mockup_uploaded',
  ]),
  triggerJson: z.record(z.any()).optional(),
  action: z.enum(['send_email', 'send_whatsapp', 'notify_admin', 'update_order_status']),
  actionJson: z.record(z.any()),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = await prisma.automationRule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error('GET /api/admin/automations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.parse(body);

    const rule = await prisma.automationRule.create({
      data: {
        name: parsed.name,
        trigger: parsed.trigger,
        triggerJson: parsed.triggerJson || {},
        action: parsed.action,
        actionJson: parsed.actionJson,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/admin/automations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
