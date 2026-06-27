import { NextResponse } from 'next/server';
import { buildProductCsv } from '@/lib/product-csv';

/**
 * GET /api/admin/products/bulk-upload/sample
 * Downloads a filled-in SAMPLE sheet with several real products across
 * different categories — a reference for how a completed upload should look.
 */
export async function GET() {
  try {
    const rows: Record<string, string>[] = [
      {
        name: 'Insulated Steel Bottle 750ml', sku: 'DRIN-Insula-4', brand: 'Milton/Cello',
        status: 'active', isFeatured: 'no', sortOrder: '1',
        category: 'Drinkware', subcategory: 'Insulated Steel Bottle',
        material: '304 Stainless Steel (double-wall vacuum)',
        lengthCm: '7', widthCm: '7', heightCm: '26', weightG: '280',
        colors: 'Matte Black, Silver, Navy, Teal', sizes: '750 ml', moq: '25', leadTimeDays: '10',
        isEcoCertified: 'no', ecoCertification: '',
        hsnCode: '7323', printingTechnique: 'laser_engraving', printingPosition: 'Body (laser wrap)',
        brandingArea: '60x40 mm', sampleAvailable: 'no',
        occasions: 'Onboarding, Events, Festive', recipientTags: 'All staff, Trade-show',
        descriptionShort: 'Core staple — large flat surface for clean laser branding.',
        vendorName: 'Milton / Cello', vendorCost: '330', sourcingStatus: 'ok',
        t1_minQty: '1', t1_maxQty: '24', t1_costPrice: '330', t1_sellPrice: '550',
        t2_minQty: '25', t2_maxQty: '49', t2_costPrice: '304', t2_sellPrice: '510',
        t3_minQty: '50', t3_maxQty: '99', t3_costPrice: '281', t3_sellPrice: '485',
        t4_minQty: '100', t4_maxQty: '249', t4_costPrice: '257', t4_sellPrice: '460',
        t5_minQty: '250', t5_maxQty: '499', t5_costPrice: '238', t5_sellPrice: '440',
        t6_minQty: '500', t6_maxQty: '', t6_costPrice: '221', t6_sellPrice: '425',
      },
      {
        name: '10000mAh Fast Power Bank', sku: 'TECH-PowerB19', brand: 'boAt/Mi',
        status: 'active', isFeatured: 'yes', sortOrder: '16',
        category: 'Tech & Gadgets', subcategory: 'Power Bank',
        material: 'ABS shell + Li-Po cells',
        lengthCm: '14', widthCm: '7', heightCm: '1.6', weightG: '220',
        colors: 'Black, White, Navy', sizes: '10000 mAh', moq: '25', leadTimeDays: '12',
        isEcoCertified: 'no',
        hsnCode: '8507', printingTechnique: 'uv_print', printingPosition: 'Top surface',
        brandingArea: '45x25 mm', sampleAvailable: 'no',
        occasions: 'Onboarding, Client, R&R', recipientTags: 'Employees, Clients',
        descriptionShort: '22.5W fast-charge slim bank — daily-use, high brand exposure.',
        vendorName: 'boAt', vendorCost: '840', sourcingStatus: 'to_approach',
        t1_minQty: '1', t1_maxQty: '24', t1_costPrice: '840', t1_sellPrice: '1200',
        t2_minQty: '25', t2_maxQty: '49', t2_costPrice: '773', t2_sellPrice: '1115',
        t3_minQty: '50', t3_maxQty: '99', t3_costPrice: '714', t3_sellPrice: '1055',
        t4_minQty: '100', t4_maxQty: '249', t4_costPrice: '655', t4_sellPrice: '1010',
        t5_minQty: '250', t5_maxQty: '499', t5_costPrice: '605', t5_sellPrice: '960',
        t6_minQty: '500', t6_maxQty: '', t6_costPrice: '563', t6_sellPrice: '925',
      },
      {
        name: 'Cotton Polo T-Shirt', sku: 'APPA-PoloT-73', brand: 'Scott/Ruffty',
        status: 'active', isFeatured: 'no', sortOrder: '70',
        category: 'Apparel', subcategory: 'Polo T-Shirt',
        material: 'Cotton Pique',
        weightG: '200',
        colors: 'White, Black, Navy, Grey, Maroon', sizes: 'S, M, L, XL, XXL', moq: '50', leadTimeDays: '12',
        isEcoCertified: 'no',
        hsnCode: '6105', printingTechnique: 'embroidery', printingPosition: 'Left chest / Back',
        brandingArea: '100x100 mm', sampleAvailable: 'no',
        occasions: 'Onboarding, Events, Festive', recipientTags: 'All staff, Trade-show',
        descriptionShort: 'The undisputed onboarding/event apparel anchor.',
        vendorName: 'Tiruppur Apparel OEM', vendorCost: '210', sourcingStatus: 'to_approach',
        t1_minQty: '1', t1_maxQty: '24', t1_costPrice: '210', t1_sellPrice: '350',
        t2_minQty: '25', t2_maxQty: '49', t2_costPrice: '193', t2_sellPrice: '325',
        t3_minQty: '50', t3_maxQty: '99', t3_costPrice: '179', t3_sellPrice: '310',
        t4_minQty: '100', t4_maxQty: '249', t4_costPrice: '164', t4_sellPrice: '295',
        t5_minQty: '250', t5_maxQty: '499', t5_costPrice: '151', t5_sellPrice: '280',
        t6_minQty: '500', t6_maxQty: '', t6_costPrice: '141', t6_sellPrice: '270',
      },
      {
        name: 'Dry-Fruit Gift Box', sku: 'GOUR-DryFru88', brand: 'Happilo/Farmley',
        status: 'active', isFeatured: 'yes', sortOrder: '85',
        category: 'Gourmet & Hampers', subcategory: 'Dry Fruit Hamper',
        material: 'Assorted nuts (food-grade)',
        lengthCm: '20', widthCm: '20', heightCm: '8', weightG: '600',
        sizes: 'Assorted', moq: '25', leadTimeDays: '7',
        isEcoCertified: 'no',
        hsnCode: '0802', printingTechnique: 'none', printingPosition: 'Sleeve / box lid',
        brandingArea: 'Full sleeve', sampleAvailable: 'no',
        occasions: "Festive, Client, Women's Day", recipientTags: 'Employees, Clients',
        descriptionShort: 'Assorted premium nuts box — inclusive, robust for pan-India logistics.',
        vendorName: 'Happilo', vendorCost: '420', sourcingStatus: 'to_approach',
        t1_minQty: '1', t1_maxQty: '24', t1_costPrice: '420', t1_sellPrice: '700',
        t2_minQty: '25', t2_maxQty: '49', t2_costPrice: '386', t2_sellPrice: '650',
        t3_minQty: '50', t3_maxQty: '99', t3_costPrice: '357', t3_sellPrice: '615',
        t4_minQty: '100', t4_maxQty: '249', t4_costPrice: '328', t4_sellPrice: '590',
        t5_minQty: '250', t5_maxQty: '499', t5_costPrice: '302', t5_sellPrice: '560',
        t6_minQty: '500', t6_maxQty: '', t6_costPrice: '281', t6_sellPrice: '540',
      },
      {
        name: 'Premium Jute / RPET Tote', sku: 'ECO-Jute-130', brand: 'Generic',
        status: 'active', isFeatured: 'no', sortOrder: '127',
        category: 'Eco & Sustainable', subcategory: 'Jute / Canvas Tote',
        material: 'Recycled PET (rPET)',
        lengthCm: '38', widthCm: '42', heightCm: '10', weightG: '160',
        colors: 'Natural, Black, Navy', sizes: 'Standard', moq: '50', leadTimeDays: '12',
        isEcoCertified: 'yes', ecoCertification: 'GRS (recycled)',
        hsnCode: '4202', printingTechnique: 'screen_print', printingPosition: 'Centre front',
        brandingArea: '200x200 mm', sampleAvailable: 'no',
        occasions: "Onboarding, Client, Women's Day", recipientTags: 'Employees, Clients',
        descriptionShort: 'Premium jute/recycled-PET tote — ESG story + huge organic impressions.',
        vendorName: 'Eco OEM', vendorCost: '420', sourcingStatus: 'to_approach',
        t1_minQty: '1', t1_maxQty: '24', t1_costPrice: '420', t1_sellPrice: '700',
        t2_minQty: '25', t2_maxQty: '49', t2_costPrice: '386', t2_sellPrice: '650',
        t3_minQty: '50', t3_maxQty: '99', t3_costPrice: '357', t3_sellPrice: '615',
        t4_minQty: '100', t4_maxQty: '249', t4_costPrice: '328', t4_sellPrice: '590',
        t5_minQty: '250', t5_maxQty: '499', t5_costPrice: '302', t5_sellPrice: '560',
        t6_minQty: '500', t6_maxQty: '', t6_costPrice: '281', t6_sellPrice: '540',
      },
      {
        name: 'Parker Beta / Vector Pen', sku: 'STAT-Execut-56', brand: 'Parker',
        status: 'active', isFeatured: 'no', sortOrder: '53',
        category: 'Stationery & Desk', subcategory: 'Executive Pen',
        material: 'Brass / Metal',
        lengthCm: '14', widthCm: '1.2', heightCm: '1.2', weightG: '25',
        colors: 'Black, Silver, Blue', sizes: 'One Size', moq: '50', leadTimeDays: '10',
        isEcoCertified: 'no',
        hsnCode: '9608', printingTechnique: 'laser_engraving', printingPosition: 'Barrel / clip',
        brandingArea: '40x6 mm', sampleAvailable: 'no',
        occasions: 'Onboarding, Client, Anniversary', recipientTags: 'Employees, Clients',
        descriptionShort: 'Parker — THE classic corporate pen, personalised.',
        vendorName: 'Parker (Luxor)', vendorCost: '180', sourcingStatus: 'to_approach',
        t1_minQty: '1', t1_maxQty: '24', t1_costPrice: '180', t1_sellPrice: '300',
        t2_minQty: '25', t2_maxQty: '49', t2_costPrice: '166', t2_sellPrice: '280',
        t3_minQty: '50', t3_maxQty: '99', t3_costPrice: '153', t3_sellPrice: '265',
        t4_minQty: '100', t4_maxQty: '249', t4_costPrice: '140', t4_sellPrice: '250',
        t5_minQty: '250', t5_maxQty: '499', t5_costPrice: '130', t5_sellPrice: '240',
        t6_minQty: '500', t6_maxQty: '', t6_costPrice: '121', t6_sellPrice: '230',
      },
    ];

    const csv = buildProductCsv(rows);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="giftcraft-products-sample.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating sample sheet:', error);
    return NextResponse.json({ error: 'Failed to generate sample sheet' }, { status: 500 });
  }
}
