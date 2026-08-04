import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Access denied" };

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold-50 text-gold">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 018 0v3" />
          </svg>
        </div>
        <p className="overline text-gold-700">403 · Restricted</p>
        <h1 className="mt-3 font-display text-4xl text-ink">
          Access <span className="italic text-em">denied.</span>
        </h1>
        <p className="mt-4 text-base text-ink-2">
          You don&apos;t have permission to view this page. If you think this is a
          mistake, ask your company admin to update your role, or contact the
          Arts Shala team.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="em" size="lg">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="mailto:support@givoo.in">Contact Admin</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
