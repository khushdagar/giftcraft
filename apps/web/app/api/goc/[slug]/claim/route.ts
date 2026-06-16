import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const claimSchema = z.object({
  optionId: z.string().min(1),
  claimerName: z.string().min(2),
  claimerEmail: z.string().email(),
  claimerPhone: z.string().regex(/^\d{10}$/),
  addressLine1: z.string().min(3),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
});

type ClaimData = z.infer<typeof claimSchema>;

interface RouteParams {
  params: { slug: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = params;
    const body = await req.json();

    // Validate request body
    const validation = claimSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Fetch campaign
    const campaign = await prisma.gocCampaign.findUnique({
      where: { slug },
      include: { claims: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'This campaign is not active' },
        { status: 410 }
      );
    }

    if (campaign.expiresAt && new Date() > campaign.expiresAt) {
      return NextResponse.json(
        { error: 'This campaign has expired' },
        { status: 410 }
      );
    }

    // Check claim limit
    if (campaign.claimLimit && campaign.claims.length >= campaign.claimLimit) {
      return NextResponse.json(
        { error: 'This campaign has reached its claim limit' },
        { status: 400 }
      );
    }

    // Check for duplicate email claim
    const existingClaim = await prisma.gocClaim.findFirst({
      where: {
        campaignId: campaign.id,
        claimerEmail: data.claimerEmail,
      },
    });

    if (existingClaim) {
      return NextResponse.json(
        {
          error: 'You have already claimed a gift from this campaign',
          claimToken: existingClaim.token,
        },
        { status: 400 }
      );
    }

    // Verify option belongs to campaign
    const option = await prisma.gocOption.findFirst({
      where: {
        id: data.optionId,
        campaignId: campaign.id,
      },
    });

    if (!option) {
      return NextResponse.json(
        { error: 'Invalid option selection' },
        { status: 400 }
      );
    }

    // Create claim
    const addressJson = {
      line1: data.addressLine1,
      line2: data.addressLine2 || '',
      city: data.city,
      state: data.state,
      pincode: data.pincode,
    };

    const claimToken = nanoid(16);
    const claim = await prisma.gocClaim.create({
      data: {
        campaignId: campaign.id,
        optionId: data.optionId,
        token: claimToken,
        claimerName: data.claimerName,
        claimerEmail: data.claimerEmail,
        claimerPhone: data.claimerPhone,
        addressJson: addressJson,
        status: 'submitted',
        claimedAt: new Date(),
      },
    });

    console.log('✅ GOC Claim created:', claim.id, 'token:', claimToken);

    return NextResponse.json(
      {
        success: true,
        data: {
          claimId: claim.id,
          token: claimToken,
          message: 'Your claim has been submitted successfully!',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating GOC claim:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create claim' },
      { status: 500 }
    );
  }
}
