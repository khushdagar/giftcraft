import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isHiddenCategory } from '@/lib/catalog-visibility';

export async function GET(request: NextRequest) {
  try {
    // Fallback Unsplash images for categories (used when no custom image is set)
    const fallbackImages = [
      "https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1484480494535-248f3fcb1173?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
    ];

    // Top-level categories with at least one live catalog product. An empty
    // category has a noindex landing page and a dead-end dropdown entry, so it
    // should not surface in the nav or homepage tiles either.
    //
    // Sub-categories are deliberately excluded: they are a drill-down on the
    // category landing page, and listing them here floods the nav dropdown.
    // A parent counts as populated if either it or one of its children has
    // live products.
    const allCategories = await prisma.category.findMany({
      where: {
        parentId: null,
        OR: [
          { products: { some: { product: { status: 'active', isPack: false } } } },
          { children: { some: { products: { some: { product: { status: 'active', isPack: false } } } } } },
        ],
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    // Drop the packaging/add-on categories — they back the builder selectors,
    // not the catalog filter bar.
    const categories = allCategories.filter((cat) => !isHiddenCategory(cat));

    // Add fallback image if category doesn't have one
    const categoriesWithImages = categories.map((cat, idx) => ({
      ...cat,
      imageUrl: cat.imageUrl || fallbackImages[idx % fallbackImages.length]
    }));

    return NextResponse.json({
      data: categoriesWithImages,
      count: categories.length
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
