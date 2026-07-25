'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  image: string;
  basePrice: number;
}

interface ClaimOptionCardProps {
  option: {
    id: string;
    product: Product;
  };
  isSelected: boolean;
  onSelect: () => void;
}

export function ClaimOptionCard({ option, isSelected, onSelect }: ClaimOptionCardProps) {
  const { product } = option;

  return (
    <motion.button
      onClick={onSelect}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
      className={`w-full text-left rounded-md border-2 overflow-hidden transition ${
        isSelected
          ? 'border-em bg-em-50 ring-2 ring-em/30'
          : 'border-bdr bg-white hover:border-em'
      }`}
    >
      {/* Product Image */}
      <div className="relative w-full bg-gray-50 aspect-square overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-ink mb-1">{product.name}</h3>
        {product.basePrice > 0 && (
          <p className="text-sm text-ink-2 mb-3">
            Regular price: ₹{product.basePrice.toFixed(0)}
          </p>
        )}

        {/* Radio Button */}
        <div className="flex items-center gap-2">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
              isSelected
                ? 'border-em bg-em'
                : 'border-bdr bg-white'
            }`}
          >
            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <span className="text-sm font-medium text-ink">
            {isSelected ? 'Selected' : 'Select this'}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
