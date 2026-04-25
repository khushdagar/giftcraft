import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bell, Lock, User as UserIcon } from 'lucide-react';

export const revalidate = 60;

export default async function SettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const settingsSections = [
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Manage email, SMS, and push notification preferences',
      href: '/dashboard/settings/notifications',
    },
    {
      icon: Lock,
      title: 'Privacy & Consent',
      description: 'Control your data sharing and consent preferences',
      href: '/dashboard/settings/privacy',
    },
    {
      icon: UserIcon,
      title: 'Profile',
      description: 'Update your personal information and preferences',
      href: '/dashboard/settings/profile',
    },
  ];

  return (
    <div>
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-black tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-2">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-md border-2 border-bdr bg-white p-6 transition hover:border-em hover:shadow-lg"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-em-50 group-hover:bg-em group-hover:text-white transition">
                <Icon className="h-6 w-6 text-em group-hover:text-white" />
              </div>
              <h3 className="font-bold text-ink mb-2">{section.title}</h3>
              <p className="text-sm text-ink-2">{section.description}</p>
              <div className="mt-4 text-xs font-semibold text-em group-hover:underline">
                Go to {section.title} →
              </div>
            </Link>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="mt-12 rounded-md border-2 border-bdr bg-gray-50 p-8 text-center">
        <p className="text-ink-2 mb-4">Can't find what you're looking for?</p>
        <Link href="/contact" className="text-em font-semibold hover:underline">
          Get in touch with our support team
        </Link>
      </div>
    </div>
  );
}
