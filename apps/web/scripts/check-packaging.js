#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const packaging = await prisma.packaging.findMany({
      select: { id: true, name: true, slug: true, price: true, lengthCm: true, widthCm: true, heightCm: true }
    });

    console.log('All Packaging:');
    console.table(packaging);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
