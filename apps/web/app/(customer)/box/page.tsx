'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBoxStore } from '@/store/box';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { BoxBudgetMeter } from '@/components/builder/box-budget-meter';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function BuildYourBoxPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  const budget = useBoxStore((s) => s.budget);
  const categoryId = useBoxStore((s) => s.categoryId);
  const totalPrice = useBoxStore((s) => s.getTotalPrice());
  const isBudgetExceeded = useBoxStore((s) => s.isBudgetExceeded());
  const products = useBoxStore((s) => s.products);
  const setBudget = useBoxStore((s) => s.setBudget);
  const setCategoryId = useBoxStore((s) => s.setCategoryId);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Initialize from URL params
  useEffect(() => {
    setMounted(true);
    const budgetParam = searchParams.get('budget');
    const categoryParam = searchParams.get('category');

    if (budgetParam) {
      const parsedBudget = parseInt(budgetParam, 10);
      if (!isNaN(parsedBudget) && parsedBudget > 0) {
        setBudget(parsedBudget);
      }
    }

    if (categoryParam) {
      setCategoryId(categoryParam);
    }
  }, [searchParams, setBudget, setCategoryId]);

  if (!mounted || status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800"></div>
          <p className="mt-4 text-ink-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">
            NEW FEATURE
          </p>
          <h1 className="text-4xl sm:text-5xl font-normal mt-2 text-ink">
            Build Your Box
          </h1>
          <p className="text-base text-ink-2 mt-3 max-w-2xl">
            Create a custom gift pack within your budget. We'll help you maximize every rupee!
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Budget Info */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-20 space-y-6"
            >
              <BoxBudgetMeter budget={budget} spent={totalPrice} />

              {/* Tips */}
              {budget > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-blue-50 rounded-md border-2 border-blue-200 p-4 space-y-2"
                >
                  <h3 className="text-sm font-normal text-blue-700">💡 Pro Tips</h3>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Mix and match products</li>
                    <li>• Add personalization</li>
                    <li>• Mix price tiers smartly</li>
                    <li>• Use seasonal products</li>
                  </ul>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Right: Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Budget Setup Section (if no budget) */}
            {budget === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 rounded-md border-2 border-amber-200 p-6"
              >
                <h2 className="text-lg font-normal text-amber-800 mb-4">Set Your Budget</h2>
                <p className="text-sm text-amber-700 mb-4">
                  No budget set yet. Add a budget parameter to get started:
                </p>
                <p className="text-xs bg-white rounded-md border border-amber-200 p-3 font-mono text-amber-900 mb-4">
                  /box?budget=5000
                </p>
                <Link
                  href="/builder"
                  className="inline-block px-6 py-2 bg-navy-800 hover:bg-navy-900 text-white font-normal rounded-2xl transition"
                >
                  Go to Regular Builder
                </Link>
              </motion.div>
            )}

            {/* Content Available */}
            {budget > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Header */}
                <div>
                  <p className="text-xs font-normal uppercase tracking-wider text-ink-3">
                    STEP 01
                  </p>
                  <h2 className="text-3xl font-normal mt-2 text-ink">
                    Choose Products
                  </h2>
                  <p className="text-base text-ink-2 mt-2">
                    Select products that fit within your ₹{budget} budget. The budget meter above will track your spending in real-time.
                  </p>
                </div>

                {/* Info Boxes */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-emerald-50 rounded-md border-2 border-em-200 p-4"
                  >
                    <p className="text-xs text-em-700 uppercase font-normal mb-2">
                      Your Budget
                    </p>
                    <p className="text-2xl font-normal text-em">₹{budget}</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`rounded-md border-2 p-4 ${
                      isBudgetExceeded
                        ? 'bg-rose-50 border-rose-300'
                        : 'bg-sky-50 border-sky-200'
                    }`}
                  >
                    <p className={`text-xs uppercase font-normal mb-2 ${isBudgetExceeded ? 'text-rose-700' : 'text-sky-700'}`}>
                      {isBudgetExceeded ? '⚠️ Over Budget' : '✓ Within Budget'}
                    </p>
                    <p className={`text-2xl font-normal ${isBudgetExceeded ? 'text-rose-700' : 'text-sky-700'}`}>
                      ₹{totalPrice}
                    </p>
                  </motion.div>
                </div>

                {/* Category Filter */}
                {categoryId && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-indigo-50 rounded-md border-2 border-indigo-200 p-4"
                  >
                    <p className="text-sm text-indigo-700 font-normal">
                      📁 Category filter applied: {categoryId}
                    </p>
                  </motion.div>
                )}

                {/* CTA to Builder */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-r from-navy-50 to-sky-50 rounded-md border-2 border-navy-200 p-8 text-center"
                >
                  <h3 className="text-lg font-normal text-navy-800 mb-3">Ready to Build?</h3>
                  <p className="text-sm text-navy-700 mb-6">
                    Use the builder to select products within your budget. The budget meter will guide you!
                  </p>
                  <Link
                    href={`/builder${categoryId ? `?category=${categoryId}` : ''}`}
                    className="inline-block px-8 py-4 bg-navy-800 hover:bg-navy-900 text-white font-normal rounded-2xl transition transform hover:-translate-y-1"
                  >
                    Open Builder
                  </Link>
                </motion.div>

                {/* Features List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: 'Budget Tracking', desc: 'Real-time budget meter' },
                    { title: 'Smart Filtering', desc: 'Focus on products in range' },
                    { title: 'Price Tiers', desc: 'See price changes per quantity' },
                    { title: 'Instant Calculations', desc: 'See total cost live' },
                  ].map((feature, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                      className="bg-white rounded-md border-2 border-bdr p-4"
                    >
                      <p className="font-normal text-ink text-sm">{feature.title}</p>
                      <p className="text-xs text-ink-2 mt-1">{feature.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
