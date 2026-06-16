import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sampleOrders = await prisma.sampleOrder.findMany({
      where: { userId: session.user.id },
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
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sampleOrders });
  } catch (error) {
    console.error("[DASHBOARD SAMPLES GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch sample orders" },
      { status: 500 }
    );
  }
}
