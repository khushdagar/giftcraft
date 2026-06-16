-- Add test dimensions to products
UPDATE "Product" SET
  "dimensionL" = 10,
  "dimensionW" = 10,
  "dimensionH" = 10
WHERE "dimensionL" IS NULL;

-- Add test dimensions to packaging with prices
UPDATE "Packaging" SET
  "lengthCm" = 12,
  "widthCm" = 12,
  "heightCm" = 12
WHERE "slug" = 'white-gift-box';

UPDATE "Packaging" SET
  "lengthCm" = 20,
  "widthCm" = 20,
  "heightCm" = 20
WHERE "slug" = 'kraft-box';

UPDATE "Packaging" SET
  "lengthCm" = 30,
  "widthCm" = 25,
  "heightCm" = 20
WHERE "slug" = 'luxury-wooden-trunk';

UPDATE "Packaging" SET
  "lengthCm" = 15,
  "widthCm" = 15,
  "heightCm" = 15
WHERE "slug" = 'premium-rigid-box';

-- Make sure all packaging has prices > 0
UPDATE "Packaging" SET "price" = 50 WHERE "price" = 0 OR "price" IS NULL;
