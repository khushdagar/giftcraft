import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { catalogueInputSchema } from '@/lib/catalogue';
import { catalogueScalarData, sectionsCreateInput, uniqueCatalogueSlug } from '@/lib/catalogue-admin';

/**
 * GET    /api/admin/catalogues/[id] — full catalogue for the editor
 * PUT    /api/admin/catalogues/[id] — replace fields + sections
 * DELETE /api/admin/catalogues/[id]
 */

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') return null;
  return session;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const catalogue = await prisma.catalogue.findUnique({
      where: { id: params.id },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    images: { where: { isPrimary: true }, take: 1, select: { url: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!catalogue) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ catalogue });
  } catch (error) {
    console.error('Error loading catalogue:', error);
    return NextResponse.json({ error: 'Failed to load catalogue' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const existing = await prisma.catalogue.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const parsed = catalogueInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input', issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const input = parsed.data;
    const slug =
      input.slug && input.slug !== existing.slug
        ? await uniqueCatalogueSlug(input.slug, existing.id)
        : existing.slug;

    // Sections are replaced wholesale — their ids are never referenced
    // outside the catalogue, and this keeps ordering/removal trivially right.
    const catalogue = await prisma.$transaction(async (tx) => {
      await tx.catalogueSection.deleteMany({ where: { catalogueId: existing.id } });
      return tx.catalogue.update({
        where: { id: existing.id },
        data: {
          ...catalogueScalarData(input),
          slug,
          sections: { create: sectionsCreateInput(input.sections) },
        },
        select: { id: true, slug: true },
      });
    });

    return NextResponse.json({ catalogue });
  } catch (error) {
    console.error('Error updating catalogue:', error);
    return NextResponse.json({ error: 'Failed to update catalogue' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    await prisma.catalogue.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting catalogue:', error);
    return NextResponse.json({ error: 'Failed to delete catalogue' }, { status: 500 });
  }
}
