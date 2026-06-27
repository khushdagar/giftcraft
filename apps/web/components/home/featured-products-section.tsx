"use client";
import React from "react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Heart,
  Star,
  Zap,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  Check,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useBuilderStore } from "@/store/builder";

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  images?: Array<{ url: string }>;
  priceTiers?: Array<{ sellPrice: number }>;
  sellPrice?: number;
  price?: number;
  printingTechnique?: string;
  hsn?: { gstRate: number; hsn: { code: string } };
}

interface FeaturedProductsSectionProps {
  products: Product[];
}

export function FeaturedProductsSection({
  products,
}: FeaturedProductsSectionProps) {
  const [wishlisted, setWishlisted] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    type: "cart" | "gift";
    product: string;
  } | null>(null);

  const addToCart = useCartStore((state) => state.addItem);
  const addToBuilder = useBuilderStore((state) => state.addProduct);

  // Clear notification after 3 seconds
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    const price =
      product.priceTiers?.[0]?.sellPrice || product.sellPrice || product.price;
    const imageUrl = product.images?.[0]?.url;

    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(price),
      image: imageUrl,
      brand: product.brand,
    });
    setNotification({ type: "cart", product: product.name });
  };

  const handleBuildGift = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    const price =
      product.priceTiers?.[0]?.sellPrice || product.sellPrice || product.price;

    addToBuilder({
      id: product.id,
      name: product.name,
      slug: product.slug,
      quantity: 1,
      sellPrice: Number(price),
      brand: product.brand,
      printingTechnique: product.printingTechnique,
      hsnCode: product.hsn?.hsn?.code,
      gstRate: product.hsn?.gstRate,
      images: product.images,
    });
    setNotification({ type: "gift", product: product.name });
  };

  const handleWishlist = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    const newWishlisted = new Set(wishlisted);
    if (newWishlisted.has(productId)) {
      newWishlisted.delete(productId);
    } else {
      newWishlisted.add(productId);
    }
    setWishlisted(newWishlisted);
  };

  return (
    <>
      {/* Notification Toast */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-full shadow-lg text-white font-normal ${
              notification.type === "gift"
                ? "bg-em hover:bg-em-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <Check className="w-5 h-5" />
            <span>
              {notification.type === "gift"
                ? `✨ "${notification.product}" added to Gift Builder!`
                : `🛒 "${notification.product}" added to Cart!`}
            </span>
          </div>
        </motion.div>
      )}

      <section className="py-16 bg-white">
        <div className="container-gc">
          <div className="mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 mb-3"
            >
              <Sparkles className="w-5 h-5 text-em" />
              <span className="text-sm font-normal text-em uppercase tracking-wider">
                BESTSELLERS
              </span>
            </motion.div>
            <div className="flex items-center justify-between mb-3">
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="text-4xl font-normal text-slate-900"
              >
                Most Loved Products
              </motion.h2>
              <Link href="/catalog">
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 bg-em hover:bg-em-600 text-white font-normal py-3 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                >
                  View All <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>
            <p className="text-slate-600">
              Trusted by 500+ corporate teams • Fast customization • Quality
              assured
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product, idx) => {
                const imageUrl = product.images?.[0]?.url;
                const price =
                  product.priceTiers?.[0]?.sellPrice ||
                  product.sellPrice ||
                  product.price;
                const isWishlisted = wishlisted.has(product.id);

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group"
                  >
                    <Link href={`/products/${product.slug}`}>
                      <div className="relative h-80 mb-4 rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-100 group-hover:border-em transition-all duration-300 aspect-[3/4]">
                        {imageUrl ? (
                          <Image
                            src={imageUrl!}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <Image
                            src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=500&fit=crop"
                            alt="Corporate Gift"
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300 opacity-40"
                          />
                        )}

                        {/* Wishlist Button */}
                        <button
                          onClick={(e) => handleWishlist(e, product.id)}
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md transition-all duration-200 z-10"
                        >
                          <Heart
                            className={`w-5 h-5 transition-colors ${
                              isWishlisted
                                ? "fill-red-500 text-red-500"
                                : "text-gray-600 hover:text-red-500"
                            }`}
                          />
                        </button>

                        {/* Action Buttons Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={(e) => handleBuildGift(e, product)}
                              className="flex-1 bg-em hover:bg-em-600 active:bg-em-700 text-white text-xs font-normal py-2 rounded-lg transition-colors flex items-center justify-center gap-1 focus:outline-none focus:ring-0"
                            >
                              <Zap className="w-3 h-3" />
                              Build Gift
                            </button>
                            <button
                              onClick={(e) => handleAddToCart(e, product)}
                              className="flex-1 bg-white hover:bg-gray-100 active:bg-gray-200 text-slate-900 text-xs font-normal py-2 rounded-lg transition-colors flex items-center justify-center gap-1 focus:outline-none focus:ring-0"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              Add Cart
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-normal text-slate-900 text-xl line-clamp-2 mb-2 group-hover:text-em transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <div className="w-full flex justify-between items-center gap-2">
                            <div>
                              <span className="text-xl font-normal text-em">
                                ₹{Math.round(Number(price))}
                              </span>
                            </div>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-5 h-5 ${i < 4 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-4">Loading products...</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className="animate-pulse">
                    <div className="h-40 bg-gray-200 rounded-lg mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
