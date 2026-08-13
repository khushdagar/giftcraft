import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  return (
    <>
      <Navbar />
      <main className="bg-canvas">
        <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-6 py-16">
          <div className="w-full max-w-md">
            <div className="rounded-md border border-bdr bg-white p-8 shadow-card sm:p-10">
              <p className="overline text-ink-3">Account recovery</p>
              <h1 className="mt-2 font-display text-[2rem] leading-tight text-ink">
                Set a new password
              </h1>

              {token ? (
                <>
                  <p className="mt-3 text-sm text-ink-2">
                    Choose a new password for your GIVOO account.
                  </p>
                  <ResetPasswordForm token={token} />
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm text-ink-2">
                    This reset link is missing or incomplete. Please request a new
                    one — reset links are valid for 1 hour.
                  </p>
                  <p className="mt-6 text-sm">
                    <Link
                      href="/forgot-password"
                      className="font-normal text-em underline-offset-2 hover:underline"
                    >
                      Request a new reset link
                    </Link>
                  </p>
                </>
              )}

              <p className="mt-6 text-center text-sm text-ink-2">
                <Link
                  href="/login"
                  className="font-normal text-em underline-offset-2 hover:underline"
                >
                  Back to sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
