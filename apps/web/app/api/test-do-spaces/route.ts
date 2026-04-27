import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

/**
 * GET /api/test-do-spaces
 * Test Digital Ocean Spaces connectivity and credentials
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const region = process.env.DO_SPACES_REGION || 'sfo3';
    const bucket = process.env.DO_SPACES_BUCKET || 'giftcraft-dev';
    const accessKey = process.env.DO_SPACES_KEY;
    const secretKey = process.env.DO_SPACES_SECRET;

    console.log('Testing DO Spaces connection...');
    console.log('Region:', region);
    console.log('Bucket:', bucket);
    console.log('Access Key configured:', !!accessKey);
    console.log('Secret Key configured:', !!secretKey);

    if (!accessKey || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Digital Ocean Spaces credentials in environment',
          details: {
            DO_SPACES_KEY: !!accessKey ? 'configured' : 'MISSING',
            DO_SPACES_SECRET: !!secretKey ? 'configured' : 'MISSING',
            DO_SPACES_REGION: region,
            DO_SPACES_BUCKET: bucket,
          },
        },
        { status: 400 }
      );
    }

    // Test connection by checking if bucket exists
    const client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      endpoint: `https://${region}.digitaloceanspaces.com`,
      forcePathStyle: false,
    });

    try {
      const command = new HeadBucketCommand({ Bucket: bucket });
      await client.send(command);

      return NextResponse.json({
        success: true,
        message: 'Digital Ocean Spaces credentials are valid ✅',
        details: {
          region,
          bucket,
          endpoint: `https://${region}.digitaloceanspaces.com`,
          cdnEndpoint: process.env.DO_SPACES_CDN_ENDPOINT || `https://${bucket}.${region}.cdn.digitaloceanspaces.com`,
        },
      });
    } catch (bucketError) {
      const errorMsg = bucketError instanceof Error ? bucketError.message : String(bucketError);
      console.error('Bucket access error:', errorMsg);

      // Check if it's an auth error or a bucket not found error
      const isAuthError =
        errorMsg.includes('InvalidAccessKeyId') ||
        errorMsg.includes('SignatureDoesNotMatch') ||
        errorMsg.includes('Forbidden') ||
        errorMsg.includes('403');

      if (isAuthError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication failed - Invalid credentials',
            details: {
              message: 'The DO_SPACES_KEY or DO_SPACES_SECRET appears to be invalid or expired',
              suggestedActions: [
                'Verify credentials in .env.local',
                'Check DO Spaces console for valid access keys',
                'Ensure keys have s3:* permissions',
                'Check if keys have expired',
              ],
            },
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Bucket access failed: ${errorMsg}`,
          details: {
            bucket,
            region,
            possibleCauses: [
              'Bucket does not exist',
              'Bucket is in different region',
              'Credentials do not have access to this bucket',
              'Bucket has access restrictions',
            ],
          },
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('DO Spaces test error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal error testing DO Spaces',
        details: {
          message: errorMsg,
        },
      },
      { status: 500 }
    );
  }
}
