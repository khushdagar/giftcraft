import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateCommunicationSchema = z.object({
  type: z.enum(['call', 'email', 'whatsapp', 'meeting', 'note']),
  note: z.string().min(1).max(2000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const [communications, total] = await Promise.all([
      prisma.vendorCommunication.findMany({
        where: { vendorId: id },
        select: {
          id: true,
          type: true,
          note: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vendorCommunication.count({ where: { vendorId: id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        communications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching vendor communications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor communications' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const validation = CreateCommunicationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const communication = await prisma.vendorCommunication.create({
      data: {
        vendorId: id,
        type: validation.data.type,
        note: validation.data.note,
        createdById: session.user.id,
      },
      select: {
        id: true,
        type: true,
        note: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, data: communication },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating vendor communication:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor communication' },
      { status: 500 }
    );
  }
}
