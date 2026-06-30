'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Payment {
  id: string;
  invoiceNumber: string | null;
  amount: string;
  dueDate: string;
  paidAt: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

export function VendorPaymentsTab({ vendorId }: { vendorId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    amount: '',
    dueDate: '',
    notes: '',
  });

  useEffect(() => {
    fetchPayments();
  }, [vendorId]);

  const fetchPayments = async () => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/payments`);
      const { data } = await response.json();
      setPayments(data.payments);
    } catch (error) {
      toast.error('Failed to fetch payments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
          dueDate: new Date(formData.dueDate).toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to add payment');
        return;
      }

      toast.success('Payment record created');
      setFormData({ invoiceNumber: '', amount: '', dueDate: '', notes: '' });
      setShowForm(false);
      fetchPayments();
    } catch (error) {
      toast.error('Error creating payment record');
      console.error(error);
    }
  };

  if (loading) return <div className="text-center py-8 text-ink-2">Loading payments...</div>;

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    paid: 'bg-em-50 text-em-700',
    overdue: 'bg-err/10 text-err',
    cancelled: 'bg-recessed text-ink-2',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-normal text-ink">Payment Records</h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="rounded-2xl bg-em px-6 font-normal"
        >
          {showForm ? 'Cancel' : '+ Add Payment'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-bdr rounded-lg p-6 bg-canvas">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-normal text-ink mb-2">Invoice Number</label>
              <Input
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleChange}
                placeholder="INV-2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-normal text-ink mb-2">Amount *</label>
              <Input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="10000"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-normal text-ink mb-2">Due Date *</label>
            <Input
              type="datetime-local"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-normal text-ink mb-2">Notes</label>
            <Input
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes"
            />
          </div>

          <Button type="submit" className="rounded-2xl bg-em px-6 font-normal">
            Add Payment
          </Button>
        </form>
      )}

      <div className="border border-bdr rounded-lg overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-elevated border-b border-bdr">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-normal text-ink-2 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bdr">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-ink-2">
                  No payment records yet
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-canvas">
                  <td className="px-6 py-4 text-sm text-ink">{payment.invoiceNumber || '—'}</td>
                  <td className="px-6 py-4 text-sm font-normal text-ink">₹{Number(payment.amount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-ink">{new Date(payment.dueDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-normal ${statusColors[payment.status] || 'bg-gray-100'}`}>
                      {payment.status.replace('_', ' ').charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
