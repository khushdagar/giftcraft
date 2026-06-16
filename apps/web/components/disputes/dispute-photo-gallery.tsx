'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface DisputePhotoGalleryProps {
  photos: string[];
  title?: string;
}

export function DisputePhotoGallery({
  photos,
  title = 'Dispute Photos',
}: DisputePhotoGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (photos.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  return (
    <div>
      {/* Thumbnail Grid */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-ink mb-3">{title}</p>
        <div className="grid grid-cols-3 gap-3">
          {photos.map((url, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                setIsOpen(true);
              }}
              className={`relative aspect-square rounded-md overflow-hidden border-2 transition ${
                currentIndex === idx && isOpen
                  ? 'border-navy-800'
                  : 'border-bdr hover:border-navy-800'
              }`}
            >
              <img
                src={url}
                alt={`Dispute photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Modal Lightbox */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-2xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
              >
                <X className="w-8 h-8" />
              </button>

              {/* Main Image */}
              <div className="rounded-lg overflow-hidden bg-black">
                <img
                  src={photos[currentIndex]}
                  alt={`Dispute photo ${currentIndex + 1}`}
                  className="w-full h-auto"
                />
              </div>

              {/* Navigation */}
              {photos.length > 1 && (
                <>
                  {/* Previous Button */}
                  <button
                    onClick={goToPrevious}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 text-white hover:text-gray-300 transition"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>

                  {/* Next Button */}
                  <button
                    onClick={goToNext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 text-white hover:text-gray-300 transition"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>

                  {/* Counter */}
                  <div className="text-center text-white text-sm font-semibold mt-4">
                    {currentIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
