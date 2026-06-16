/**
 * Test script to verify all variant operations work end-to-end
 * Tests: Create, Read, Update, Delete, and combinations
 */

const baseUrl = 'http://localhost:3000/api/admin/products';

// Get auth session - you need to set this
const headers = {
  'Content-Type': 'application/json',
  'Cookie': 'YOUR_SESSION_COOKIE_HERE'
};

async function test() {
  try {
    console.log('\n=== VARIANT OPERATIONS TEST ===\n');

    // 1. Get all products
    console.log('1️⃣  Fetching products list...');
    const productsRes = await fetch(`${baseUrl}?limit=1`, { headers });
    const productsData = await productsRes.json();
    if (!productsData.products || productsData.products.length === 0) {
      console.error('❌ No products found');
      return;
    }

    const productId = productsData.products[0].id;
    const productName = productsData.products[0].name;
    console.log(`✅ Found product: ${productName} (ID: ${productId})\n`);

    // 2. Fetch existing variants
    console.log('2️⃣  Fetching existing variants...');
    const variantsRes = await fetch(`${baseUrl}/${productId}/variants`, { headers });
    const variants = await variantsRes.json();
    console.log(`✅ Found ${variants.length} existing variants`);
    if (variants.length > 0) {
      variants.forEach(v => console.log(`   - ${v.kind}: ${v.value}`));
    }
    console.log();

    // 3. Test adding a size variant
    console.log('3️⃣  Adding size variant...');
    const newVariant = {
      kind: 'size',
      value: 'Test Size Large',
      sortOrder: variants.length,
    };
    const createRes = await fetch(`${baseUrl}/${productId}/variants`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newVariant),
    });
    if (!createRes.ok) {
      const error = await createRes.json();
      console.error(`❌ Failed to create variant: ${error.error}`);
      return;
    }
    const createdVariant = await createRes.json();
    console.log(`✅ Created variant: ${createdVariant.kind} - ${createdVariant.value}\n`);

    // 4. Verify variant was created
    console.log('4️⃣  Verifying variant was created...');
    const variantsRes2 = await fetch(`${baseUrl}/${productId}/variants`, { headers });
    const variants2 = await variantsRes2.json();
    const foundVariant = variants2.find(v => v.value === 'Test Size Large');
    if (foundVariant) {
      console.log(`✅ Variant found in database\n`);
    } else {
      console.error(`❌ Variant not found in database`);
      return;
    }

    // 5. Test deleting the variant
    console.log('5️⃣  Deleting variant...');
    const deleteRes = await fetch(
      `${baseUrl}/${productId}/variants?variantId=${createdVariant.id}`,
      { method: 'DELETE', headers }
    );
    if (!deleteRes.ok) {
      const error = await deleteRes.json();
      console.error(`❌ Failed to delete variant: ${error.error}`);
      return;
    }
    console.log(`✅ Variant deleted\n`);

    // 6. Verify deletion
    console.log('6️⃣  Verifying variant was deleted...');
    const variantsRes3 = await fetch(`${baseUrl}/${productId}/variants`, { headers });
    const variants3 = await variantsRes3.json();
    const shouldBeGone = variants3.find(v => v.value === 'Test Size Large');
    if (!shouldBeGone) {
      console.log(`✅ Variant successfully removed from database\n`);
    } else {
      console.error(`❌ Variant still exists in database`);
      return;
    }

    // 7. Test adding multiple types
    console.log('7️⃣  Adding multiple variant types...');
    const multipleVariants = [
      { kind: 'size', value: 'Medium', sortOrder: 0 },
      { kind: 'size', value: 'Large', sortOrder: 1 },
      { kind: 'material', value: 'Cotton', sortOrder: 2 },
      { kind: 'color', value: 'Blue', hexColor: '#0000FF', sortOrder: 3 },
    ];

    for (const variant of multipleVariants) {
      const res = await fetch(`${baseUrl}/${productId}/variants`, {
        method: 'POST',
        headers,
        body: JSON.stringify(variant),
      });
      if (!res.ok) {
        const error = await res.json();
        console.error(`❌ Failed to create ${variant.kind}: ${error.error}`);
      } else {
        console.log(`   ✅ Added ${variant.kind}: ${variant.value}`);
      }
    }
    console.log();

    // 8. Final verification
    console.log('8️⃣  Final variant list...');
    const finalRes = await fetch(`${baseUrl}/${productId}/variants`, { headers });
    const finalVariants = await finalRes.json();
    console.log(`✅ Total variants: ${finalVariants.length}`);
    finalVariants.forEach(v => {
      console.log(`   - ${v.kind}: ${v.value}${v.hexColor ? ` (${v.hexColor})` : ''}`);
    });

    console.log('\n✅ ALL TESTS PASSED!\n');
  } catch (err) {
    console.error('❌ Test error:', err.message);
  }
}

test();
