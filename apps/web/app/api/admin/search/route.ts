import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/search?q=foo
 * Global admin search — matches across orders, products, categories, clients,
 * enquiries and vendors so the topbar search box can jump straight to any of them.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const q = (new URL(request.url).searchParams.get('q') || '').trim();
  if (q.length < 1) return NextResponse.json({ groups: [] });

  const [orders, products, categories, companies, enquiries, vendors] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { billingJson: { path: ['companyName'], string_contains: q } },
          { billingJson: { path: ['email'], string_contains: q } },
        ],
      },
      select: { id: true, orderNumber: true, status: true, grandTotal: true, billingJson: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, sku: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, slug: true },
      take: 5,
    }),
    prisma.company.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { gstin: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, city: true, tier: true },
      take: 5,
    }),
    prisma.enquiry.findMany({
      where: {
        OR: [
          { companyName: { contains: q, mode: 'insensitive' } },
          { contactName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { productName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, companyName: true, contactName: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.vendor.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, type: true, onboardingStatus: true },
      take: 5,
    }),
  ]);

  const groups = [
    {
      type: 'orders',
      label: 'Orders',
      items: orders.map((o) => {
        const billing = (o.billingJson as any) || {};
        return {
          id: o.id,
          title: `#${o.orderNumber}`,
          subtitle: `${billing.companyName || billing.email || '—'} · ${o.status}`,
          href: `/admin/orders/${o.id}`,
        };
      }),
    },
    {
      type: 'products',
      label: 'Products',
      items: products.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `SKU ${p.sku} · ${p.status}`,
        href: `/admin/products/${p.id}/edit`,
      })),
    },
    {
      type: 'categories',
      label: 'Categories',
      items: categories.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: `/${c.slug}`,
        href: `/admin/categories/${c.id}/edit`,
      })),
    },
    {
      type: 'clients',
      label: 'Clients',
      items: companies.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: [c.city, c.tier].filter(Boolean).join(' · '),
        href: `/admin/clients/${c.id}`,
      })),
    },
    {
      type: 'enquiries',
      label: 'Enquiries',
      items: enquiries.map((e) => ({
        id: e.id,
        title: e.companyName,
        subtitle: `${e.contactName} · ${e.status}`,
        href: `/admin/enquiries`,
      })),
    },
    {
      type: 'vendors',
      label: 'Vendors',
      items: vendors.map((v) => ({
        id: v.id,
        title: v.name,
        subtitle: [v.type, v.onboardingStatus].filter(Boolean).join(' · '),
        href: `/admin/vendors/${v.id}`,
      })),
    },
  ].filter((g) => g.items.length > 0);

  return NextResponse.json({ groups });
}
