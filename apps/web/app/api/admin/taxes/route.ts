import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateHsnCodeSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  defaultGstRate: z.number().min(0).max(100),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const codes = await prisma.hsnCode.findMany({
      orderBy: { code: 'asc' },
    });

    return NextResponse.json(codes);
  } catch (error) {
    console.error('Error fetching HSN codes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateHsnCodeSchema.parse(body);

    const code = await prisma.hsnCode.create({
      data: {
        code: data.code,
        description: data.description,
        defaultGstRate: data.defaultGstRate,
      },
    });

    return NextResponse.json(code);
  } catch (error) {
    console.error('Error creating HSN code:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
