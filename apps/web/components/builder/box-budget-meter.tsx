'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

interface BudgetMeterProps {
  budget: number;
  spent: number;
}

export function BoxBudgetMeter({ budget, spent }: BudgetMeterProps) {
  const shouldReduce = useReducedMotion();
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = Math.max(0, budget - spent);
  const isExceeded = spent > budget && budget > 0;

  // Color based on percentage
  let bgColor = 'bg-amber-400'; // <80%
  let barColor = 'from-amber-400 to-amber-500';
  let labelColor = 'text-amber-700';

  if (percentage >= 80 && percentage < 100) {
    bgColor = 'bg-orange-400';
    barColor = 'from-orange-400 to-orange-500';
    labelColor = 'text-orange-700';
  } else if (percentage >= 100) {
    bgColor = 'bg-rose-400';
    barColor = 'from-rose-400 to-rose-500';
    labelColor = 'text-rose-700';
  }

  return (
    <motion.div
      initial={shouldReduce ? {} : { opacity: 0, y: -20 }}
      animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-sky-50 to-emerald-50 rounded-md border-2 border-sky-200 p-6"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-sky-700">Budget Tracking</h3>
          <span className={`text-xs font-semibold ${labelColor}`}>
            {isExceeded ? 'Over Budget' : `${Math.round(percentage)}%`}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
          <motion.div
            initial={shouldReduce ? { width: 0 } : { width: 0 }}
            animate={shouldReduce ? { width: `${Math.min(percentage, 100)}%` } : { width: `${Math.min(percentage, 100)}%` }}
            transition={
              shouldReduce
                ? {}
                : {
                    type: 'spring',
                    stiffness: 50,
                    damping: 15,
                    duration: 0.5,
                  }
            }
            className={`h-full bg-gradient-to-r ${barColor}`}
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {/* Spent */}
          <div className="bg-white rounded-md border border-sky-200 p-2">
            <p className="text-xs text-sky-600 uppercase font-semibold mb-1">Spent</p>
            <p className="text-base font-black text-ink">₹{Math.round(spent)}</p>
          </div>

          {/* Budget */}
          <div className="bg-white rounded-md border border-sky-200 p-2">
            <p className="text-xs text-sky-600 uppercase font-semibold mb-1">Budget</p>
            <p className="text-base font-black text-ink">₹{Math.round(budget)}</p>
          </div>

          {/* Remaining */}
          <div className={`rounded-md border p-2 ${isExceeded ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'}`}>
            <p className={`text-xs uppercase font-semibold mb-1 ${isExceeded ? 'text-rose-600' : 'text-emerald-600'}`}>
              {isExceeded ? 'Over' : 'Left'}
            </p>
            <p className={`text-base font-black ${isExceeded ? 'text-rose-700' : 'text-emerald-700'}`}>
              ₹{Math.round(remaining)}
            </p>
          </div>
        </div>

        {/* Warning */}
        {isExceeded && (
          <motion.div
            initial={shouldReduce ? {} : { opacity: 0, y: -10 }}
            animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
            className="bg-rose-100 border border-rose-300 rounded-md p-2"
          >
            <p className="text-xs text-rose-700 font-semibold">
              💡 Tip: Remove some items to get back within budget
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
