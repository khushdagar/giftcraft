import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .min(10, "Enter a valid mobile number")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // If the account exists from Google sign-in but has no password, let them
      // set one; otherwise it's a genuine duplicate.
      if (existing.passwordHash) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, phone: existing.phone || phone, name: existing.name || name },
      });
      return NextResponse.json({ success: true, data: { id: existing.id, email } }, { status: 200 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const seedEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
    const role = seedEmail && email === seedEmail ? "super_admin" : "company_member";

    const user = await prisma.user.create({
      data: { name, email, phone, passwordHash, role },
      select: { id: true, email: true },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }
    console.error("Error registering user:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
