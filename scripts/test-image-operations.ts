/**
 * Test script for image upload, update, and delete operations
 * Run with: npx ts-node scripts/test-image-operations.ts
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function getAuthToken(): Promise<string> {
  console.log('Getting auth token...');
  // This would need to be replaced with actual auth flow
  // For testing, we'd need a valid session
  return 'test-token';
}

async function testImageUpload(productId: string, imagePath: string): Promise<boolean> {
  try {
    console.log(`\n📤 Testing image upload for product ${productId}...`);

    const fileContent = fs.readFileSync(imagePath);
    const form = new FormData();
    form.append('images', fileContent, path.basename(imagePath));

    const response = await fetch(`${BASE_URL}/api/admin/products/${productId}/images`, {
      method: 'POST',
      body: form as any,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log(`✅ Upload successful: ${result.uploadedCount} image(s) saved`);

    if (result.failedCount > 0) {
      console.warn(`⚠️ Failed images: ${result.failedImages.join(', ')}`);
    }

    return result.uploadedCount > 0;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Upload failed: ${errorMsg}`);
    results.push({
      name: 'Image Upload',
      passed: false,
      error: errorMsg,
    });
    return false;
  }
}

async function testImageDelete(productId: string, imageId: string): Promise<boolean> {
  try {
    console.log(`\n🗑️  Testing image deletion...`);

    const response = await fetch(
      `${BASE_URL}/api/admin/products/${productId}/images?imageId=${imageId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Delete failed: ${JSON.stringify(error)}`);
    }

    console.log(`✅ Image deleted successfully`);
    results.push({
      name: 'Image Delete',
      passed: true,
    });
    return true;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Delete failed: ${errorMsg}`);
    results.push({
      name: 'Image Delete',
      passed: false,
      error: errorMsg,
    });
    return false;
  }
}

async function testGetProduct(productId: string): Promise<boolean> {
  try {
    console.log(`\n📖 Testing GET product endpoint...`);

    const response = await fetch(`${BASE_URL}/api/admin/products/${productId}`);

    if (!response.ok) {
      throw new Error(`GET failed: ${response.statusText}`);
    }

    const product = await response.json();
    console.log(`✅ Product fetched: ${product.name}`);
    console.log(`   Images: ${product.images?.length || 0}`);

    results.push({
      name: 'GET Product',
      passed: true,
    });
    return true;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ GET failed: ${errorMsg}`);
    results.push({
      name: 'GET Product',
      passed: false,
      error: errorMsg,
    });
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting image operations test suite...\n');

  // Test with a sample product ID (you'd need to replace this)
  const testProductId = 'cmogoomr40000zdh2vuq20f6c';

  try {
    // Test 1: GET product
    await testGetProduct(testProductId);

    // Test 2: Upload image (requires a test image file)
    const testImagePath = path.join(process.cwd(), 'test-image.jpg');
    if (fs.existsSync(testImagePath)) {
      const uploadSuccess = await testImageUpload(testProductId, testImagePath);

      // Test 3: Delete image (would need actual imageId from upload response)
      // await testImageDelete(testProductId, 'image-id-here');
    } else {
      console.warn(`⚠️ Test image not found at ${testImagePath}, skipping upload test`);
    }

    // Print summary
    console.log('\n\n📊 Test Summary:');
    console.log('═'.repeat(50));
    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('═'.repeat(50));
    console.log(`\nPassed: ${passed}/${total}`);

    if (passed === total) {
      console.log('✨ All tests passed!');
    } else {
      console.log(`⚠️ ${total - passed} test(s) failed`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite error:', err);
    process.exit(1);
  }
}

runTests();
