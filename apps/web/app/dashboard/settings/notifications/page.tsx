'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

interface Preferences {
  email: boolean;
  whatsapp: boolean;
  orderStatus: boolean;
  quotes: boolean;
  disputes: boolean;
  marketing: boolean;
}

const preferenceCategories = [
  {
    title: 'Communication Channels',
    description: 'How you want to receive notifications',
    items: [
      {
        key: 'email',
        label: 'Email Notifications',
        description: 'Receive updates via email',
      },
      {
        key: 'whatsapp',
        label: 'WhatsApp Notifications',
        description: 'Receive updates via WhatsApp',
      },
    ],
  },
  {
    title: 'Event Notifications',
    description: 'Which events you want to be notified about',
    items: [
      {
        key: 'orderStatus',
        label: 'Order Status Updates',
        description: 'Get notified when your order status changes',
      },
      {
        key: 'quotes',
        label: 'Quote Requests',
        description: 'Get notified about quote requests and responses',
      },
      {
        key: 'disputes',
        label: 'Dispute Updates',
        description: 'Get notified about dispute status changes',
      },
    ],
  },
  {
    title: 'Marketing & Promotions',
    description: 'Optional communications about products and offers',
    items: [
      {
        key: 'marketing',
        label: 'Marketing Emails',
        description: 'Receive product updates, offers, and promotions',
      },
    ],
  },
];

export default function NotificationsSettingsPage() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await fetch('/api/settings/notifications');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      return response.json() as Promise<{ success: boolean; data: Preferences }>;
    },
  });

  useEffect(() => {
    if (data) {
      setPreferences(data.data);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (newPreferences: Preferences) => {
      const response = await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences),
      });
      if (!response.ok) throw new Error('Failed to update preferences');
      return response.json();
    },
    onSuccess: () => {
      setUnsavedChanges(false);
    },
  });

  const handleToggle = (key: keyof Preferences) => {
    if (preferences) {
      setPreferences({ ...preferences, [key]: !preferences[key] });
      setUnsavedChanges(true);
    }
  };

  const handleSave = () => {
    if (preferences) {
      updateMutation.mutate(preferences);
    }
  };

  if (isLoading || !preferences) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-ink-2">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-ink">Notification Preferences</h1>
        <p className="mt-1 text-sm text-ink-2">Manage how you receive notifications</p>
      </div>

      <div className="space-y-8">
        {preferenceCategories.map((category) => (
          <div key={category.title} className="border border-bdr rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-ink">{category.title}</h2>
              <p className="text-sm text-ink-2 mt-1">{category.description}</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-bdr">
              {category.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-ink cursor-pointer block">
                      {item.label}
                    </label>
                    <p className="text-xs text-ink-2 mt-1">{item.description}</p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() => handleToggle(item.key as keyof Preferences)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences[item.key as keyof Preferences]
                          ? 'bg-em'
                          : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences[item.key as keyof Preferences]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Data Privacy & Protection Act Consent */}
      <div className="border border-bdr rounded-lg p-6 space-y-4 bg-elevated">
        <h2 className="text-lg font-bold text-ink">Data Privacy & Protection</h2>
        <p className="text-sm text-ink-2">
          We respect your privacy. Your data is securely stored and only used as per your preferences above.
          By using GiftCraft, you consent to our{' '}
          <a href="/privacy" className="text-em hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 pt-6 border-t border-bdr">
        <Button
          onClick={handleSave}
          disabled={!unsavedChanges || updateMutation.isPending}
          className="flex-1 rounded-2xl bg-em px-6 py-3 font-bold hover:bg-em-600"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
        {unsavedChanges && (
          <p className="text-sm text-warn flex items-center gap-2">
            You have unsaved changes
          </p>
        )}
      </div>
    </div>
  );
}
