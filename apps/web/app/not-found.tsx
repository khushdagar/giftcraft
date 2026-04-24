import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas py-12 px-4 flex items-center justify-center">
      <div className="container-gc-w max-w-lg text-center">
        {/* 404 */}
        <div className="rounded-md border-2 border-err/20 bg-err/5 p-12 mb-8">
          <p className="text-7xl font-black text-err">404</p>
        </div>

        {/* Heading */}
        <h1 className="t-title text-ink mb-3">Page not found</h1>
        <p className="text-ink-2 mb-8">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Quick Links */}
        <div className="space-y-3 mb-8">
          <Button asChild variant="em" size="lg" className="w-full rounded-md">
            <Link href="/">Back to Home</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full rounded-md">
            <Link href="/builder">Start Building</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="w-full rounded-md">
            <Link href="/catalog">Browse Products</Link>
          </Button>
        </div>

        {/* Help Link */}
        <p className="text-sm text-ink-3">
          Still need help?{' '}
          <Link href="/contact" className="text-em font-semibold hover:underline">
            Get in touch
          </Link>
        </p>
      </div>
    </div>
  );
}
