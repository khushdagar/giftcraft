'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/builder';

  const handleGoogleSignIn = async () => {
    await signIn('google', {
      callbackUrl,
      redirect: true,
    });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left half — Hidden on mobile, gradient background on desktop */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-gold-50 via-em-50 to-[#EEF2FF] p-12">
        <div className="space-y-8 text-center max-w-md">
          <div>
            <h2 className="font-display text-4xl font-black text-ink mb-2">
              GiftCraft
            </h2>
            <p className="text-ink-2 text-lg">
              India's self-serve bulk corporate gifting platform
            </p>
          </div>

          {/* Decorative product grid illustration (emoji-based fallback) */}
          <div className="grid grid-cols-3 gap-4">
            {['🎁', '📦', '🎉', '💝', '🎀', '✨'].map((emoji, i) => (
              <div
                key={i}
                className="aspect-square rounded-gc bg-white/50 flex items-center justify-center text-3xl hover:scale-110 transition-transform"
              >
                {emoji}
              </div>
            ))}
          </div>

          <p className="text-sm text-ink-3">
            Streamline your corporate gifting with instant transparent pricing and beautiful branded gift packs.
          </p>
        </div>
      </div>

      {/* Right half — White card on desktop, full width on mobile */}
      <div className="flex items-center justify-center bg-canvas p-4 lg:bg-white">
        <div className="w-full max-w-sm rounded-gc-l shadow-float bg-white p-8 lg:shadow-none lg:bg-transparent lg:p-0">
          {/* Logo and heading */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-black text-ink mb-2">
              Welcome back
            </h1>
            <p className="text-ink-2">
              Sign in to your account to manage orders and quotes
            </p>
          </div>

          {/* Google OAuth button */}
          <Button
            onClick={handleGoogleSignIn}
            variant="dark"
            size="xl"
            className="w-full gap-3 mb-6"
          >
            {/* Google G icon SVG */}
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Fine print */}
          <p className="text-xs text-center text-ink-3">
            For vendor portal access, contact{' '}
            <a href="mailto:hello@giftcraft.in" className="underline hover:text-ink-2">
              hello@giftcraft.in
            </a>
          </p>

          {/* Mobile only: Extra spacing and gradient background pill */}
          <div className="mt-8 lg:hidden text-center">
            <p className="text-xs text-ink-3">
              New to GiftCraft?{' '}
              <a href="/" className="text-em font-semibold hover:underline">
                Start building your gift pack
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
