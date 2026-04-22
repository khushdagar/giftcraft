'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export function ImageGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragStart, setDragStart] = useState(0);

  const sortedImages = [...(images || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeImage = sortedImages[activeIndex] || { url: '', id: '0', isPrimary: true, sortOrder: 0 };

  const handleDragEnd = (info: any) => {
    const offset = dragStart - info.offset.x;
    if (Math.abs(offset) > 50) {
      const direction = offset > 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(sortedImages.length - 1, activeIndex + direction));
      setActiveIndex(nextIndex);
    }
  };

  return (
    <div>
      {/* Main image */}
      <motion.div
        drag="x"
        dragElastic={0.2}
        onDragStart={() => setDragStart(0)}
        onDragEnd={handleDragEnd}
        className="relative flex aspect-square items-center justify-center rounded-gc-l bg-elevated overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {activeImage.url ? (
          <Image
            src={activeImage.url}
            alt={productName}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <span className="text-[140px] opacity-70">📦</span>
        )}
      </motion.div>

      {/* Thumbnails */}
      {sortedImages.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {sortedImages.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`flex aspect-square items-center justify-center rounded-gc bg-elevated transition ${
                i === activeIndex ? 'ring-2 ring-em' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {img.url ? (
                <Image src={img.url} alt={`${productName} thumbnail`} fill className="object-cover rounded-gc" />
              ) : (
                <span className="text-2xl">📦</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
