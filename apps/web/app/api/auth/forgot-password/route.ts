import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { zEmail } from "@/lib/zod-fields";
import { sendPasswordResetEmail } from "@/lib/email";

const ForgotPasswordSchema = z.object({ email: zEmail });

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESEND_COOLDOWN_MS = 60 * 1000; // ignore repeat requests within a minute

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const email = parsed.data.email;
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    // Always answer the same way so the endpoint can't be used to probe
    // which emails have accounts. OAuth-only users may also reset — it
    // simply sets their first password (same as the register route).
    if (user) {
      const recent = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
        select: { id: true },
      });

      if (!recent) {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

        await prisma.$transaction([
          prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
          prisma.passwordResetToken.create({
            data: {
              userId: user.id,
              tokenHash,
              expires: new Date(Date.now() + TOKEN_TTL_MS),
            },
          }),
        ]);

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl: `${appUrl}/reset-password?token=${rawToken}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { message: "If an account exists for this email, a reset link has been sent." },
    });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
