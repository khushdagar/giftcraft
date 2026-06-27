import { NextResponse } from 'next/server';
import { buildProductCsv } from '@/lib/product-csv';

/**
 * GET /api/admin/products/bulk-upload/template
 * Downloads a blank CSV template (headers + one example row) covering the full
 * product-master sheet. Multi-value cells (colours, sizes, occasions, recipient
 * tags, images) are comma-separated inside the quoted cell.
 */
export async function GET() {
  try {
    const example: Record<string, string> = {
      name: 'Insulated Steel Bottle 750ml',
      sku: 'DRIN-Insula-4',
      slug: '',
      brand: 'Milton/Cello',
      status: 'active',
      isFeatured: 'no',
      sortOrder: '1',
      category: 'Drinkware',
      subcategory: 'Insulated Steel Bottle',
      material: '304 Stainless Steel (double-wall vacuum)',
      lengthCm: '7', widthCm: '7', heightCm: '26', weightG: '280',
      colors: 'Matte Black, Silver, Navy, Teal',
      sizes: '750 ml',
      moq: '25',
      leadTimeDays: '10',
      isEcoCertified: 'no',
      ecoCertification: '',
      hsnCode: '7323',
      printingTechnique: 'laser_engraving',
      printingPosition: 'Body (laser wrap)',
      brandingArea: '60x40 mm',
      sampleAvailable: 'no',
      occasions: 'Onboarding, Events, Festive',
      recipientTags: 'All staff, Trade-show',
      descriptionShort: 'Core staple — large flat surface for clean laser branding.',
      descriptionLong: '',
      imageUrls: '',
      vendorName: 'Milton / Cello',
      vendorSku: '', vendorMoq: '', vendorLeadDays: '', vendorCost: '330',
      sourcingStatus: 'ok', altVendorName: '',
      t1_minQty: '1', t1_maxQty: '24', t1_costPrice: '330', t1_sellPrice: '550',
      t2_minQty: '25', t2_maxQty: '49', t2_costPrice: '304', t2_sellPrice: '510',
      t3_minQty: '50', t3_maxQty: '99', t3_costPrice: '281', t3_sellPrice: '485',
      t4_minQty: '100', t4_maxQty: '249', t4_costPrice: '257', t4_sellPrice: '460',
      t5_minQty: '250', t5_maxQty: '499', t5_costPrice: '238', t5_sellPrice: '440',
      t6_minQty: '500', t6_maxQty: '', t6_costPrice: '221', t6_sellPrice: '425',
    };

    const csv = buildProductCsv([example]);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="giftcraft-products-template.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating CSV template:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
