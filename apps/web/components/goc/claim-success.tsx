'use client';

import { motion } from 'framer-motion';
import { CheckCircle, PartyPopper as ConfettiIcon } from 'lucide-react';
import Link from 'next/link';
import Confetti from 'react-confetti';
import { useEffect, useState } from 'react';

interface ClaimSuccessProps {
  claimerName: string;
  claimerEmail: string;
}

export function ClaimSuccess({ claimerName, claimerEmail }: ClaimSuccessProps) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-canvas flex items-center justify-center px-4 relative overflow-hidden"
    >
      {/* Confetti Animation */}
      {windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={100}
          gravity={0.3}
        />
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-md border border-bdr p-8 sm:p-12 max-w-md w-full text-center shadow-card"
      >
        {/* Checkmark Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
          className="flex justify-center mb-6"
        >
          <div className="relative w-20 h-20 bg-em-50 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-em" />
          </div>
        </motion.div>

        {/* Success Message */}
        <h1 className="font-display text-4xl text-ink mb-2">Woohoo!</h1>
        <p className="text-base text-ink-2 mb-6">
          Your gift claim has been submitted successfully!
        </p>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-em-50 rounded-md border border-bdr p-4 mb-6 text-left space-y-3"
        >
          <div>
            <p className="text-xs text-ink-3 uppercase tracking-wider font-semibold mb-1">
              Claim Recipient
            </p>
            <p className="text-sm font-semibold text-ink">{claimerName}</p>
          </div>
          <div>
            <p className="text-xs text-ink-3 uppercase tracking-wider font-semibold mb-1">
              Email Confirmation
            </p>
            <p className="text-sm font-semibold text-ink">{claimerEmail}</p>
          </div>
        </motion.div>

        {/* Next Steps */}
        <div className="bg-gold-50 rounded-md border border-gold-200 p-4 mb-6 text-left">
          <p className="text-xs text-gold-700 uppercase tracking-wider font-semibold mb-2">
            What's Next?
          </p>
          <ul className="text-sm text-gold-700 space-y-1 list-disc list-inside">
            <li>We'll process your claim within 24 hours</li>
            <li>You'll receive a confirmation email at {claimerEmail}</li>
            <li>We'll arrange delivery to your provided address</li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-block w-full px-6 py-3 bg-em hover:bg-em-600 text-white font-medium rounded-2xl transition"
          >
            Back to Home
          </Link>
          <Link
            href="/catalog"
            className="inline-block w-full px-6 py-3 border-2 border-em text-em hover:bg-em-50 font-medium rounded-2xl transition"
          >
            Explore More Gifts
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
