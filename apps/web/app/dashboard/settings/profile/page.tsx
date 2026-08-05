'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User as UserIcon, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SavedAddressesManager } from '@/components/dashboard/saved-addresses-manager';
import { FieldError } from '@/components/ui/field-error';
import { validateName, validatePhone } from '@/lib/validation';
import { CompanyProfileSection } from './company-profile-section';

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  role: string;
  createdAt: string;
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UserIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-em-50">
        <Icon className="h-5 w-5 text-em" />
      </div>
      <div>
        <h2 className="text-lg font-normal text-ink">{title}</h2>
        <p className="text-sm text-ink-2">{description}</p>
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/settings/profile');
      if (!res.ok) throw new Error('Failed to load profile');
      return res.json() as Promise<{ success: boolean; data: ProfileData }>;
    },
  });

  const profile = data?.data;

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update profile');
      }
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setTimeout(() => setSaved(false), 2500);
    },
  });

  // Phone is optional on a profile, so an empty value is fine — only a typed
  // value has to be well-formed.
  const nameError = name.trim() ? validateName(name, 'Full name') : null;
  const phoneError = phone.trim() ? validatePhone(phone) : null;

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-ink-2">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-em"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Settings
        </Link>
        <h1 className="text-3xl font-normal tracking-tight text-ink">My Profile</h1>
        <p className="mt-1 text-sm text-ink-2">
          Your personal, company, and delivery details — all in one place.
        </p>
      </div>

      {/* Identity */}
      <div className="flex items-center gap-4 rounded-lg border border-bdr bg-white p-6">
        <Avatar className="h-16 w-16">
          {profile.image && <AvatarImage src={profile.image} />}
          <AvatarFallback>{(profile.name ?? 'U')[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-ink truncate">{profile.name || 'Unnamed user'}</p>
          <p className="text-sm text-ink-2 truncate">{profile.email}</p>
          <span className="mt-1 inline-block text-xs font-normal bg-em-50 text-em-700 px-2 py-0.5 rounded">
            {profile.role.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Two-column account grid: personal · company · addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Personal details */}
      <section className="space-y-4">
        <SectionHeading
          icon={UserIcon}
          title="Personal Details"
          description="Your name and contact number."
        />
        <div className="space-y-5 rounded-lg border border-bdr bg-white p-6">
          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Full Name</label>
            <Input
              value={name}
              maxLength={100}
              aria-invalid={!!nameError}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              placeholder="Your name"
              className={`rounded-md border-2 ${nameError ? 'border-red-400' : ''}`}
            />
            <FieldError message={nameError ?? undefined} />
          </div>

          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Phone</label>
            <Input
              value={phone}
              type="tel"
              inputMode="tel"
              maxLength={14}
              aria-invalid={!!phoneError}
              onChange={(e) => {
                setPhone(e.target.value.replace(/[^\d+\s-]/g, ''));
                setDirty(true);
              }}
              placeholder="e.g. 9876543210"
              className={`rounded-md border-2 ${phoneError ? 'border-red-400' : ''}`}
            />
            <FieldError message={phoneError ?? undefined} />
          </div>

          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Email</label>
            <Input value={profile.email} disabled className="rounded-md border-2 bg-gray-50" />
            <p className="mt-1 text-xs text-ink-3">
              Email is managed by your Google sign-in and can&apos;t be changed here.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-ink block mb-1.5">Member Since</label>
            <p className="text-sm text-ink-2">
              {new Date(profile.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-3 border-t border-bdr pt-4">
            <Button
              onClick={() => mutation.mutate()}
              disabled={!dirty || mutation.isPending || !name.trim() || !!nameError || !!phoneError}
              className="rounded-2xl bg-em px-6 py-3 font-normal hover:bg-em-600"
            >
              {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
            {saved && <p className="text-sm text-em-700">✓ Profile saved</p>}
            {mutation.isError && (
              <p className="text-sm text-red-600">
                {(mutation.error as Error)?.message || 'Failed to save'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Company details */}
      <section className="space-y-4">
        <SectionHeading
          icon={Building2}
          title="Company Details"
          description="Auto-fills your billing details at checkout."
        />
        <CompanyProfileSection />
      </section>

      {/* Saved addresses */}
      <section className="space-y-4">
        <SectionHeading
          icon={MapPin}
          title="Saved Addresses"
          description="Reuse delivery addresses at checkout instead of retyping."
        />
        <div className="rounded-lg border border-bdr bg-white p-6">
          <SavedAddressesManager />
        </div>
      </section>
      </div>
    </div>
  );
}
