import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["approved", "rejected", "shipped"]),
  adminNotes: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = updateStatusSchema.parse(body);

    const sampleOrder = await prisma.sampleOrder.findUnique({
      where: { id: params.id },
    });

    if (!sampleOrder) {
      return NextResponse.json(
        { error: "Sample order not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      status: validated.status,
    };

    if (validated.status === "approved") {
      updateData.approvedAt = new Date();
    } else if (validated.status === "shipped") {
      updateData.shippedAt = new Date();
    }

    if (validated.adminNotes) {
      updateData.adminNotes = validated.adminNotes;
    }

    const updated = await prisma.sampleOrder.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("[ADMIN SAMPLE PUT]", error);
    return NextResponse.json(
      { error: "Failed to update sample order" },
      { status: 500 }
    );
  }
}
