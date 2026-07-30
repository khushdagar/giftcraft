import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { CredentialsLoginForm } from "@/components/auth/credentials-login-form";
import { BrandLogo } from "@/components/layout/brand-logo";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const session = await auth();
  // Only redirect if user is authenticated AND we have a stable session
  // (This prevents redirect loops during auth flow)
  if (session && session.user && session.user.id) {
    const redirectUrl = searchParams.from ?? (session.user.role === "super_admin" ? "/admin" : "/dashboard");
    redirect(redirectUrl);
  }

  const callbackUrl = searchParams.from ?? "/dashboard";

  return (
    <main className="min-h-screen bg-canvas">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* ── Left — editorial hero ─────────────────────────────── */}
        <aside
          className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex"
          style={{
            background:
              "linear-gradient(135deg, #FBF5E9 0%, #E8F5EF 50%, #FBF5E9 100%)",
          }}
        >
          {/* Floating gift-box echo from homepage hero */}
          <div className="absolute inset-0 flex items-center justify-center opacity-60">
            <div className="relative h-72 w-72 animate-float-b">
              <div className="absolute bottom-0 left-[10%] h-[65%] w-[80%] rounded-lg bg-gradient-to-br from-em-600 to-em-700 shadow-float" />
              <div className="absolute top-[15%] left-[5%] h-[35%] w-[90%] -rotate-3 rounded-t-lg bg-gradient-to-br from-em to-em-600 shadow-float" />
              <div className="absolute top-[10%] left-1/2 h-3 w-[14%] -translate-x-1/2 rounded-full bg-gold" />
            </div>
          </div>

          <Link
            href="/"
            className="relative z-10 inline-block"
          >
            <BrandLogo className="h-11 w-auto rounded-md" />
          </Link>

          <div className="relative z-10 space-y-5">
            <p className="overline text-em-700">By Arts Shala · Delhi</p>
            <h1 className="t-display balance font-display text-ink">
              Bulk gifting,
              <br />
              <span className="italic text-em">made beautiful.</span>
            </h1>
            <p className="max-w-sm text-base text-ink-2">
              Browse 500+ products, build branded gift packs, and get
              instant transparent pricing — without a sales rep.
            </p>
          </div>

          <p className="relative z-10 text-xs text-ink-3">
            © {new Date().getFullYear()} Arts Shala. Crafted in Delhi.
          </p>
        </aside>

        {/* ── Right — sign-in card ──────────────────────────────── */}
        <section className="flex items-center justify-center px-6 py-16 lg:px-12">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-8 inline-block lg:hidden"
            >
              <BrandLogo className="h-10 w-auto" />
            </Link>

            <div className="rounded-md border border-bdr bg-white p-8 shadow-card sm:p-10">
              <p className="overline text-ink-3">Welcome back</p>
              <h2 className="mt-2 font-display text-[2rem] leading-tight text-ink">
                Sign in to GIVOO
              </h2>
              <p className="mt-3 text-sm text-ink-2">
                Sign in with your email & password, or continue with Google.
              </p>

              {/* Email + password sign-in */}
              <CredentialsLoginForm callbackUrl={callbackUrl} />

              <p className="mt-4 text-center text-sm text-ink-2">
                New to GIVOO?{" "}
                <Link
                  href={`/register${searchParams.from ? `?from=${searchParams.from}` : ""}`}
                  className="font-normal text-em underline-offset-2 hover:underline"
                >
                  Create an account
                </Link>
              </p>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-bdr" />
                <span className="text-xs uppercase tracking-wider text-ink-3">or</span>
                <span className="h-px flex-1 bg-bdr" />
              </div>

              {/* Google button — fires a server action into NextAuth */}
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: callbackUrl });
                }}
              >
                <Button
                  type="submit"
                  variant="outline"
                  size="xl"
                  className="w-full border-bdr-2 bg-white font-normal text-ink hover:-translate-y-0.5 hover:border-em hover:shadow-hover"
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-ink-3">
                By signing in, you agree to our{" "}
                <Link href="/terms" className="text-em underline-offset-2 hover:underline">
                  Terms of Service
                </Link>{" "}
                &{" "}
                <Link href="/privacy" className="text-em underline-offset-2 hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-ink-3">
              Need vendor access?{" "}
              <a href="mailto:hello@giftcraft.in" className="font-normal text-em hover:underline">
                Contact us →
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4.1 5.3l6.2 5.2C41.4 36 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
