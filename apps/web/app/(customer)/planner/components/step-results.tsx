'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatRupees } from '@/lib/utils';
import { toast } from 'sonner';

interface StepResultsProps {
  formData: {
    occasion: string;
    recipientCount: number;
    budget: number;
  };
  onBack: () => void;
}

export function StepResults({ formData, onBack }: StepResultsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(
          `/api/planner/recommendations?budget=${formData.budget}&occasion=${formData.occasion}&qty=${formData.recipientCount}`
        );
        const { data } = await response.json();
        setRecommendations(data);
      } catch (error) {
        toast.error('Failed to fetch recommendations');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [formData.budget, formData.occasion, formData.recipientCount]);

  const bgColors = ['bg-em-50', 'bg-gold-50', 'bg-[#F5F3FF]'];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-ink mb-2">
          Perfect Picks for You
        </h2>
        <p className="text-ink-2">
          We found {recommendations.length} products that fit your {formData.recipientCount}-pack budget
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-ink-2">Loading recommendations...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-12 bg-recessed rounded-lg p-8">
          <p className="text-ink-2 mb-4">
            No products found for your budget. Try adjusting your parameters.
          </p>
          <Button onClick={onBack} variant="outline" className="rounded-2xl">
            Adjust Budget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendations.map((product, idx) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className={`${bgColors[idx]} rounded-lg border-2 border-transparent hover:border-bdr transition overflow-hidden group`}
            >
              <div className="aspect-square bg-gray-200 overflow-hidden">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-ink mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-xs text-ink-2 mb-4 line-clamp-2">{product.description}</p>
                <div className="space-y-1">
                  <p className="text-xs text-ink-2">Per Unit</p>
                  <p className="text-xl font-black text-em">{formatRupees(product.price)}</p>
                  <p className="text-xs text-ink-2">
                    Total: {formatRupees(product.totalForQty)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-6">
        <Link href="/builder" className="flex-1">
          <Button className="w-full rounded-2xl bg-em px-6 py-3 font-bold hover:bg-em-600">
            Start Building
          </Button>
        </Link>
        <Button
          onClick={onBack}
          variant="outline"
          className="rounded-2xl"
        >
          Adjust
        </Button>
      </div>
    </div>
  );
}
