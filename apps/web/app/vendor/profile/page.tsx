import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { User, Mail, Phone, MapPin } from 'lucide-react';

export const metadata = {
  title: 'Profile - GIVOO Vendor',
  description: 'View vendor profile',
};

export default async function VendorProfilePage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'vendor') {
    redirect('/unauthorized');
  }

  const vendor = await prisma.vendor.findFirst({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      city: true,
      state: true,
      address: true,
      gst: true,
      paymentTerms: true,
      vendorScore: {
        select: {
          qualityScore: true,
          onTimeScore: true,
          reliabilityScore: true,
        },
      },
    },
  });

  if (!vendor) redirect('/unauthorized');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-normal text-ink">Vendor Profile</h1>
        <p className="text-sm text-ink-2 mt-1">Your vendor account information</p>
      </div>

      {/* Contact Information */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-6">
          Contact Information
        </p>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <User className="w-5 h-5 text-em mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-ink-3 font-normal mb-1">Business Name</p>
              <p className="text-base font-normal text-ink">{vendor.name}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Mail className="w-5 h-5 text-em mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-ink-3 font-normal mb-1">Email</p>
              <p className="text-base font-normal text-ink break-all">{vendor.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Phone className="w-5 h-5 text-em mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-ink-3 font-normal mb-1">Phone</p>
              <p className="text-base font-normal text-ink">{vendor.phone || 'Not provided'}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <MapPin className="w-5 h-5 text-em mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-ink-3 font-normal mb-1">Location</p>
              <p className="text-base font-normal text-ink">
                {vendor.city && vendor.state ? `${vendor.city}, ${vendor.state}` : 'Not provided'}
              </p>
              {vendor.address && <p className="text-sm text-ink-2 mt-1">{vendor.address}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="rounded-md border-2 border-bdr bg-white p-6">
        <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-6">
          Business Information
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-ink-3 font-normal mb-2">GST Number</p>
            <p className="text-sm font-normal text-ink">{vendor.gst || 'Not provided'}</p>
          </div>

          <div>
            <p className="text-xs text-ink-3 font-normal mb-2">Payment Terms</p>
            <p className="text-sm font-normal text-ink">{vendor.paymentTerms || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {/* Performance Scores */}
      {vendor.vendorScore && (
        <div className="rounded-md border-2 border-bdr bg-white p-6">
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3 mb-6">
            Performance Scores
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-normal text-ink">Quality Score</span>
                <span className="text-sm font-normal text-em">{vendor.vendorScore.qualityScore}/100</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-em transition-all"
                  style={{ width: `${vendor.vendorScore.qualityScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-normal text-ink">On-Time Score</span>
                <span className="text-sm font-normal text-em">{vendor.vendorScore.onTimeScore}/100</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-em transition-all"
                  style={{ width: `${vendor.vendorScore.onTimeScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-normal text-ink">Reliability Score</span>
                <span className="text-sm font-normal text-em">
                  {vendor.vendorScore.reliabilityScore}/100
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-em transition-all"
                  style={{ width: `${vendor.vendorScore.reliabilityScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
