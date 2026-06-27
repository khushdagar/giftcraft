'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatRupees } from '@/lib/utils';
import { toast } from 'sonner';

interface Recommendation {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  image: string | null;
  unitPrice: number;
  totalForQty: number;
  fitsBudget: boolean;
}

interface Meta {
  perUnitBudget: number;
  matchedOccasion: boolean;
  anyWithinBudget: boolean;
  totalConsidered: number;
}

interface StepResultsProps {
  formData: {
    occasion: string;
    recipientCount: number;
    budget: number;
  };
  onBack: () => void;
}

const bgColors = ['bg-em-50', 'bg-gold-50', 'bg-[#F5F3FF]', 'bg-[#EEF2FF]', 'bg-[#FFF1F2]', 'bg-[#F0F9FF]'];

export function StepResults({ formData, onBack }: StepResultsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          budget: String(formData.budget),
          qty: String(formData.recipientCount),
        });
        if (formData.occasion) params.set('occasion', formData.occasion);

        const response = await fetch(`/api/planner/recommendations?${params.toString()}`);
        if (!response.ok) throw new Error('Request failed');
        const { data, meta } = await response.json();
        if (!active) return;
        setRecommendations(Array.isArray(data) ? data : []);
        setMeta(meta ?? null);
      } catch (error) {
        if (!active) return;
        toast.error('Failed to fetch recommendations');
        console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRecommendations();
    return () => {
      active = false;
    };
  }, [formData.budget, formData.occasion, formData.recipientCount]);

  const allOver = meta != null && !meta.anyWithinBudget && recommendations.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-normal tracking-tight text-ink mb-2">
          Perfect Picks for You
        </h2>
        {loading ? (
          <p className="text-ink-2">Finding gifts within your budget…</p>
        ) : allOver ? (
          <p className="text-ink-2">
            Nothing fit {formatRupees(meta!.perUnitBudget)} per gift exactly — here are the
            closest options just above your budget.
          </p>
        ) : (
          <p className="text-ink-2">
            We found {recommendations.length}{' '}
            {recommendations.length === 1 ? 'gift' : 'gifts'} that fit your{' '}
            {formData.recipientCount}-pack budget
            {meta && !meta.matchedOccasion && formData.occasion
              ? ' (across all occasions)'
              : ''}
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg overflow-hidden border-2 border-bdr">
              <div className="aspect-square bg-recessed animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-recessed rounded animate-pulse" />
                <div className="h-3 bg-recessed rounded w-2/3 animate-pulse" />
                <div className="h-6 bg-recessed rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-12 bg-recessed rounded-lg p-8">
          <p className="text-ink-2 mb-4">
            No products found for your budget. Try increasing your budget or reducing the
            number of packs.
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
              className={`${bgColors[idx % bgColors.length]} rounded-lg border-2 border-transparent hover:border-bdr transition overflow-hidden group`}
            >
              <div className="aspect-square bg-gray-200 overflow-hidden relative">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
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
                <span
                  className={`absolute top-3 left-3 text-xs font-normal px-2 py-1 rounded-full ${
                    product.fitsBudget
                      ? 'bg-em-50 text-em-700'
                      : 'bg-gold-50 text-gold-700'
                  }`}
                >
                  {product.fitsBudget ? '✓ Within budget' : 'Slightly over'}
                </span>
              </div>
              <div className="p-4">
                {product.brand && (
                  <p className="text-xs text-ink-2 mb-1">{product.brand}</p>
                )}
                <h3 className="font-normal text-ink mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-xs text-ink-2 mb-4 line-clamp-2">{product.description}</p>
                <div className="space-y-1">
                  <p className="text-xs text-ink-2">Per Unit</p>
                  <p className="text-xl font-normal text-em tabular-nums">
                    {formatRupees(product.unitPrice)}
                  </p>
                  <p className="text-xs text-ink-2 tabular-nums">
                    Total for {formData.recipientCount}: {formatRupees(product.totalForQty)}
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
          <Button className="w-full rounded-2xl bg-em px-6 py-3 font-normal hover:bg-em-600">
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
