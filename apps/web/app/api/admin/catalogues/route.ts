import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { catalogueInputSchema } from '@/lib/catalogue';
import { catalogueScalarData, sectionsCreateInput, uniqueCatalogueSlug } from '@/lib/catalogue-admin';

/**
 * GET  /api/admin/catalogues — list (super_admin)
 * POST /api/admin/catalogues — create (super_admin)
 */

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') return null;
  return session;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const catalogues = await prisma.catalogue.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        sections: { select: { id: true, mode: true, _count: { select: { items: true } } } },
      },
    });
    return NextResponse.json({ catalogues });
  } catch (error) {
    console.error('Error listing catalogues:', error);
    return NextResponse.json({ error: 'Failed to list catalogues' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const parsed = catalogueInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input', issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const input = parsed.data;
    const slug = await uniqueCatalogueSlug(input.slug || input.title);

    const catalogue = await prisma.catalogue.create({
      data: {
        ...catalogueScalarData(input),
        slug,
        sections: { create: sectionsCreateInput(input.sections) },
      },
      select: { id: true, slug: true },
    });

    return NextResponse.json({ catalogue }, { status: 201 });
  } catch (error) {
    console.error('Error creating catalogue:', error);
    return NextResponse.json({ error: 'Failed to create catalogue' }, { status: 500 });
  }
}
