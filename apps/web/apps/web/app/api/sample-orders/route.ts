import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSampleOrderSchema = z.object({
  productId: z.string(),
  address: z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().regex(/^\d{6}$/),
  }),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createSampleOrderSchema.parse(body);

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: validated.productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Create sample order
    const sampleOrder = await prisma.sampleOrder.create({
      data: {
        productId: validated.productId,
        userId: session.user.id,
        addressJson: validated.address,
        notes: validated.notes,
        status: "requested",
      },
    });

    return NextResponse.json(
      { success: true, id: sampleOrder.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("[SAMPLE ORDER POST]", error);
    return NextResponse.json(
      { error: "Failed to create sample order" },
      { status: 500 }
    );
  }
}
