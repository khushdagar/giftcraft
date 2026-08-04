'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';

const triggers = [
  { value: 'order_placed', label: 'Order Placed' },
  { value: 'order_confirmed', label: 'Order Confirmed' },
  { value: 'order_shipped', label: 'Order Shipped' },
  { value: 'order_delivered', label: 'Order Delivered' },
  { value: 'order_cancelled', label: 'Order Cancelled' },
  { value: 'dispute_opened', label: 'Dispute Opened' },
  { value: 'quote_created', label: 'Quote Created' },
  { value: 'quote_expired', label: 'Quote Expired' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'mockup_uploaded', label: 'Mockup Uploaded' },
];

const actions = [
  { value: 'send_email', label: 'Send Email' },
  { value: 'send_whatsapp', label: 'Send WhatsApp' },
  { value: 'notify_admin', label: 'Notify Admin' },
  { value: 'update_order_status', label: 'Update Order Status' },
];

export default function NewAutomationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    trigger: '',
    action: '',
    actionConfig: {} as Record<string, any>,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/admin/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          trigger: data.trigger,
          action: data.action,
          actionJson: data.actionConfig,
        }),
      });
      if (!res.ok) throw new Error('Failed to create automation');
      return res.json();
    },
    onSuccess: () => {
      router.push('/admin/automations');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleActionConfigChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      actionConfig: { ...prev.actionConfig, [key]: value },
    }));
  };

  const selectedAction = formData.action;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8 border-b border-bdr pb-8">
        <h1 className="text-3xl font-normal tracking-tight text-ink">Create Automation Rule</h1>
        <p className="mt-1 text-sm text-ink-2">Set up a new trigger and action</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rule Name */}
        <div>
          <label className="block text-sm font-normal text-ink mb-2">Rule Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Send order confirmation email"
            className="w-full border border-bdr rounded-lg px-4 py-2"
            required
          />
        </div>

        {/* Trigger Selection */}
        <div>
          <label className="block text-sm font-normal text-ink mb-2">Trigger Event</label>
          <select
            value={formData.trigger}
            onChange={(e) => setFormData((prev) => ({ ...prev, trigger: e.target.value }))}
            className="w-full border border-bdr rounded-lg px-4 py-2"
            required
          >
            <option value="">Select a trigger...</option>
            {triggers.map((trigger) => (
              <option key={trigger.value} value={trigger.value}>
                {trigger.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Selection */}
        <div>
          <label className="block text-sm font-normal text-ink mb-2">Action</label>
          <select
            value={formData.action}
            onChange={(e) => setFormData((prev) => ({ ...prev, action: e.target.value }))}
            className="w-full border border-bdr rounded-lg px-4 py-2"
            required
          >
            <option value="">Select an action...</option>
            {actions.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Configuration */}
        {selectedAction === 'send_email' && (
          <div className="space-y-4 border-t border-bdr pt-4">
            <p className="text-sm font-normal text-ink">Email Configuration</p>
            <input
              type="text"
              placeholder="Recipient (e.g., customer or admin@givoo.in)"
              value={formData.actionConfig.recipientEmail || ''}
              onChange={(e) => handleActionConfigChange('recipientEmail', e.target.value)}
              className="w-full border border-bdr rounded-lg px-4 py-2"
              required
            />
            <input
              type="text"
              placeholder="Email Subject"
              value={formData.actionConfig.subject || ''}
              onChange={(e) => handleActionConfigChange('subject', e.target.value)}
              className="w-full border border-bdr rounded-lg px-4 py-2"
              required
            />
            <input
              type="text"
              placeholder="Email Template ID"
              value={formData.actionConfig.template || ''}
              onChange={(e) => handleActionConfigChange('template', e.target.value)}
              className="w-full border border-bdr rounded-lg px-4 py-2"
            />
          </div>
        )}

        {selectedAction === 'send_whatsapp' && (
          <div className="space-y-4 border-t border-bdr pt-4">
            <p className="text-sm font-normal text-ink">WhatsApp Configuration</p>
            <input
              type="text"
              placeholder="Recipient Phone (e.g., +91XXXXXXXXXX)"
              value={formData.actionConfig.recipientPhone || ''}
              onChange={(e) => handleActionConfigChange('recipientPhone', e.target.value)}
              className="w-full border border-bdr rounded-lg px-4 py-2"
              required
            />
            <textarea
              placeholder="Message"
              value={formData.actionConfig.message || ''}
              onChange={(e) => handleActionConfigChange('message', e.target.value)}
              className="w-full border border-bdr rounded-lg px-4 py-2 h-24"
              required
            />
          </div>
        )}

        {selectedAction === 'notify_admin' && (
          <div className="space-y-4 border-t border-bdr pt-4">
            <p className="text-sm font-normal text-ink">Admin Notification Configuration</p>
            <textarea
              placeholder="Notification Message"
              value={formData.actionConfig.message || ''}
              onChange={(e) => handleActionConfigChange('message', e.target.value)}
              className="w-full border border-bdr rounded-lg px-4 py-2 h-24"
              required
            />
            <select
              value={formData.actionConfig.severity || 'info'}
              onChange={(e) => handleActionConfigChange('severity', e.target.value)}
              className="w-full border border-bdr rounded-lg px-4 py-2"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        )}

        {selectedAction === 'update_order_status' && (
          <div className="space-y-4 border-t border-bdr pt-4">
            <p className="text-sm font-normal text-ink">Order Status Configuration</p>
            <select
              value={formData.actionConfig.newStatus || ''}
              onChange={(e) => handleActionConfigChange('newStatus', e.target.value)}
              className="w-full border border-bdr rounded-lg px-4 py-2"
              required
            >
              <option value="">Select new status...</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-6 border-t border-bdr">
          <Button
            type="submit"
            className="flex-1 rounded-2xl bg-em px-6 py-3 font-normal hover:bg-em-600"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Rule'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
