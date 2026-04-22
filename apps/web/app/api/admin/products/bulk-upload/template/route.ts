import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const headers = [
      'name',
      'slug',
      'brand',
      'sku',
      'descriptionShort',
      'material',
      'weightG',
      'leadTimeDays',
      'printingTechnique',
      'hsnCode',
      'status',
      'isEcoCertified',
      'isFeatured',
      't1_minQty',
      't1_maxQty',
      't1_costPrice',
      't1_sellPrice',
      't2_minQty',
      't2_maxQty',
      't2_costPrice',
      't2_sellPrice',
      't3_minQty',
      't3_maxQty',
      't3_costPrice',
      't3_sellPrice',
      't4_minQty',
      't4_maxQty',
      't4_costPrice',
      't4_sellPrice',
      't5_minQty',
      't5_maxQty',
      't5_costPrice',
      't5_sellPrice',
      't6_minQty',
      't6_maxQty',
      't6_costPrice',
      't6_sellPrice',
    ];

    const example = [
      'Stainless Steel Flask 500ml',
      'flask-500ml',
      'Borosil',
      'SKU-001',
      'Durable stainless steel',
      'Stainless Steel',
      '320',
      '10',
      'uv_print',
      '9617',
      'draft',
      'false',
      'false',
      '25',
      '49',
      '200',
      '285',
      '50',
      '99',
      '190',
      '270',
      '100',
      '249',
      '180',
      '255',
      '250',
      '499',
      '170',
      '240',
      '500',
      '999',
      '160',
      '225',
      '1000',
      '',
      '150',
      '210',
    ];

    const csv = [headers.join(','), example.join(',')].join('\n');

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
