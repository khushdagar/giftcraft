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
    <div className="flex gap-3">
      {/* Thumbnails - Left side */}
      {sortedImages.length > 1 && (
        <div className="flex flex-col gap-2">
          {sortedImages.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-md bg-elevated transition ${
                i === activeIndex ? 'ring-2 ring-em' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {img.url ? (
                <Image
                  src={img.url}
                  alt={`${productName} view ${i + 1}`}
                  fill
                  className="object-cover rounded-md"
                  sizes="64px"
                />
              ) : (
                <span className="text-2xl flex items-center justify-center w-full h-full">📦</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main image - Right side */}
      <div className="flex-1">
        <motion.div
          drag="x"
          dragElastic={0.2}
          onDragStart={() => setDragStart(0)}
          onDragEnd={handleDragEnd}
          className="relative flex aspect-square items-center justify-center rounded-md bg-elevated overflow-hidden cursor-grab active:cursor-grabbing"
        >
          {activeImage?.url ? (
            <Image
              src={activeImage.url}
              alt={productName}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <span className="text-[140px] opacity-70">📦</span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
