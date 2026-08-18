import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Settings, Building2, Truck, DollarSign, Users, Clock, Gift } from 'lucide-react';
import { AdminPushCard } from '@/components/admin/admin-push-card';

interface SettingsCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const SETTINGS: SettingsCard[] = [
  {
    title: 'Business Info',
    description: 'Company name, GSTIN, address, and contact details',
    href: '/admin/settings/business',
    icon: Building2,
  },
  {
    title: 'Shipping Zones',
    description: 'Define delivery zones, rates, and ETAs',
    href: '/admin/settings/shipping',
    icon: Truck,
  },
  {
    title: 'Tax Codes',
    description: 'Manage HSN codes and GST rates',
    href: '/admin/settings/taxes',
    icon: DollarSign,
  },
  {
    title: 'Curated Packs entries',
    description: 'Cover image and blurb for the By Budget and By Occasion cards',
    href: '/admin/settings/curated-packs',
    icon: Gift,
  },
  {
    title: 'Users & Roles',
    description: 'Manage team access and permissions',
    href: '/admin/settings/users',
    icon: Users,
  },
  {
    title: 'SLA Targets',
    description: 'Set time limits for each order stage',
    href: '/admin/settings/sla',
    icon: Clock,
  },
];

export default async function SettingsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'super_admin') {
    redirect('/');
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-ink-3" />
          <p className="text-xs font-normal uppercase tracking-wider text-ink-3">Configuration</p>
        </div>
        <h1 className="text-3xl font-normal text-ink">Settings</h1>
        <p className="text-sm text-ink-2 mt-2">Manage platform configuration and business settings</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SETTINGS.map((setting) => {
          const Icon = setting.icon;
          return (
            <Link
              key={setting.href}
              href={setting.href}
              className="group rounded-md border-2 border-bdr bg-white p-6 transition hover:shadow-hover hover:border-em-200"
            >
              <div className="flex items-start justify-between mb-3">
                <Icon className="h-6 w-6 text-em-400" />
                {setting.badge && (
                  <span className="inline-block px-2 py-1 bg-em-50 text-em-700 text-xs font-normal rounded-md">
                    {setting.badge}
                  </span>
                )}
              </div>
              <h3 className="font-normal text-ink text-lg mb-1">{setting.title}</h3>
              <p className="text-sm text-ink-2 mb-4">{setting.description}</p>
              <p className="text-xs font-normal text-em group-hover:underline">Configure →</p>
            </Link>
          );
        })}
      </div>

      {/* Personal notification preferences for this admin */}
      <div>
        <h2 className="text-sm font-normal uppercase tracking-wider text-ink-3 mb-3">
          Your Notifications
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminPushCard />
        </div>
      </div>
    </div>
  );
}
