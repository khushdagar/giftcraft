import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <Navbar />
      <main className="bg-canvas">
        <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-6 py-16">
          <div className="w-full max-w-md">
            <div className="rounded-md border border-bdr bg-white p-8 shadow-card sm:p-10">
              <p className="overline text-ink-3">Account recovery</p>
              <h1 className="mt-2 font-display text-[2rem] leading-tight text-ink">
                Forgot your password?
              </h1>
              <p className="mt-3 text-sm text-ink-2">
                Enter the email you use for GIVOO and we&apos;ll send you a link to
                reset your password.
              </p>

              <ForgotPasswordForm />

              <p className="mt-6 text-center text-sm text-ink-2">
                Remembered it?{" "}
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
