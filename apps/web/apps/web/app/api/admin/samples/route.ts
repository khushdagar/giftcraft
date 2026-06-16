import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 20;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [sampleOrders, total] = await Promise.all([
      prisma.sampleOrder.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              images: {
                where: { isPrimary: true },
                select: { url: true },
                take: 1,
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sampleOrder.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      sampleOrders,
      total,
      page,
      limit,
      pages,
    });
  } catch (error) {
    console.error("[ADMIN SAMPLES GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch sample orders" },
      { status: 500 }
    );
  }
}
