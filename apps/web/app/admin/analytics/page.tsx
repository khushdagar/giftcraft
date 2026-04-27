'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Decimal } from '@prisma/client/runtime/library';

interface StatCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}

interface AnalyticsData {
  stats: StatCard[];
  revenueData: Array<{ month: string; revenue: number }>;
  statusData: Array<{ name: string; value: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    companyName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

const statusColors: Record<string, string> = {
  draft: '#A1A1AA',
  confirmed: '#0EA5E9',
  shipped: '#F59E0B',
  delivered: '#10B981',
  completed: '#8B5CF6',
  cancelled: '#EF4444',
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/admin/analytics');
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const analyticsData = (await response.json()) as AnalyticsData;
        setData(analyticsData);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-ink-2">Loading analytics...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-ink-2">Key metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {data.stats.map((stat, idx) => (
          <div key={idx} className="border border-bdr rounded-lg bg-surface p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-2">{stat.label}</p>
            <p className="mt-3 text-2xl font-black text-ink">{stat.value}</p>
            <p className={`mt-2 text-sm font-medium ${stat.trend === 'up' ? 'text-em' : 'text-err'}`}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Chart */}
        <div className="border border-bdr rounded-lg bg-surface p-6">
          <h2 className="text-lg font-bold text-ink mb-4">Revenue (Last 12 Months)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
              <XAxis dataKey="month" stroke="#71717A" />
              <YAxis stroke="#71717A" />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E4E4E7' }}
                formatter={(value) => `₹${(value as number).toLocaleString('en-IN')}`}
              />
              <Bar dataKey="revenue" fill="#00D084" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="border border-bdr rounded-lg bg-surface p-6">
          <h2 className="text-lg font-bold text-ink mb-4">Order Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} (${value})`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.statusData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={statusColors[entry.name] || '#A1A1AA'} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} orders`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      {data.recentOrders.length > 0 && (
        <div className="border border-bdr rounded-lg bg-surface p-6">
          <h2 className="text-lg font-bold text-ink mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {data.recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3 border-b border-bdr last:border-0">
                <div>
                  <p className="font-medium text-ink">{order.companyName}</p>
                  <p className="text-sm text-ink-2">{order.orderNumber}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-bold text-ink">₹{order.totalAmount.toLocaleString('en-IN')}</p>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                      order.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : order.status === 'shipped'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
