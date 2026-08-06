import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Users who already hold one of these roles are excluded — they already have access.
const PRIVILEGED_ROLES = ["super_admin", "company_admin", "vendor", "reseller"] as const;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      role: { notIn: [...PRIVILEGED_ROLES] },
      OR: [
        { email: { startsWith: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { email: true, name: true, image: true },
    orderBy: { email: "asc" },
    take: 8,
  });

  return NextResponse.json({ success: true, data: users });
}
