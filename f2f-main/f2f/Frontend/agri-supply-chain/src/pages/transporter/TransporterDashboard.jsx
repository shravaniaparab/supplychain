import React, { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  Navigation,
  CheckCircle,
  Loader2,
  IndianRupee,
  TrendingUp,
  Activity,
  Calendar
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';
import MainLayout from '../../components/layout/MainLayout';
import { dashboardAPI } from '../../services/api';

const COLORS = {
  accepted: '#8B5CF6',      // Violet
  inTransit: '#06B6D4',     // Cyan
  arrived: '#F59E0B',       // Amber
  delivered: '#10B981',     // Emerald
  completed: '#10B981',     // Emerald (same as delivered)
};

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: 'bg-gray-100 text-gray-700',
    ACCEPTED: 'bg-violet-100 text-violet-700',
    IN_TRANSIT: 'bg-cyan-100 text-cyan-700',
    IN_TRANSIT_TO_RETAILER: 'bg-cyan-100 text-cyan-700',
    ARRIVED: 'bg-amber-100 text-amber-700',
    ARRIVAL_CONFIRMED: 'bg-indigo-100 text-indigo-700',
    DELIVERED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, subtext }) => {
  const { formatNumber } = useLocalizedNumber();
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{typeof value === 'number' ? formatNumber(value) : value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`${color} p-3 rounded-xl`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

const TransporterDashboard = () => {
  const { t } = useTranslation();
  const { formatNumber, formatCurrency } = useLocalizedNumber();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch analytics data
      const analyticsRes = await dashboardAPI.getTransporterAnalytics();
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const statusChartData = analytics ? [
    { name: 'Accepted', value: analytics.status_distribution?.Accepted || 0, color: COLORS.accepted },
    { name: 'In Transit', value: analytics.status_distribution?.['In Transit'] || 0, color: COLORS.inTransit },
    { name: 'Arrived', value: analytics.status_distribution?.Arrived || 0, color: COLORS.arrived },
    { name: 'Completed', value: analytics.status_distribution?.Completed || 0, color: COLORS.completed },
  ].filter(item => item.value > 0) : [];

  const earningsChartData = analytics ? [
    { name: 'Farmer Deliveries', earnings: analytics.earnings_overview?.farmer_earnings || 0 },
    { name: 'Distributor Deliveries', earnings: analytics.earnings_overview?.distributor_earnings || 0 },
    { name: 'Total Earnings', earnings: analytics.earnings_overview?.total_earnings || 0 },
  ] : [];

  const formatCurrencyShort = (value) => {
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}k`;
    }
    return formatCurrency(value);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </MainLayout>
    );
  }

  const metrics = analytics?.metrics || {};

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transporter Dashboard</h1>
            <p className="text-gray-600">Track and manage your shipments in real-time</p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Farmer Shipments"
            value={metrics.farmer_shipments || 0}
            icon={Package}
            color="bg-blue-500"
            subtext="From Farms"
          />
          <MetricCard
            title="Distributor Shipments"
            value={metrics.distributor_shipments || 0}
            icon={Truck}
            color="bg-purple-500"
            subtext="From Distributors"
          />
          <MetricCard
            title="In Transit"
            value={metrics.in_transit || 0}
            icon={Navigation}
            color="bg-amber-500"
            subtext="Active Deliveries"
          />
          <MetricCard
            title="Completed"
            value={metrics.completed || 0}
            icon={CheckCircle}
            color="bg-emerald-500"
            subtext="Finished Jobs"
          />
          <MetricCard
            title="Total Earnings"
            value={formatCurrency(metrics.total_earnings || 0)}
            icon={IndianRupee}
            color="bg-green-600"
            subtext="Revenue Earned"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Deliveries by Status</h3>
            {statusChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center -mt-32 mb-20">
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics?.total_deliveries || 0)}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-2" />
                  <p>No delivery data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Earnings Overview Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Earnings Overview</h3>
            {earningsChartData.some(d => d.earnings > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={earningsChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrencyShort(value)}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), 'Earnings']}
                      labelStyle={{ color: '#374151' }}
                    />
                    <Bar dataKey="earnings" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                  <p>No earnings data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend Chart (Optional) */}
        {analytics?.monthly_trend && Object.keys(analytics.monthly_trend).length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Shipment Activity Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={Object.entries(analytics.monthly_trend).map(([month, count]) => ({ month, count }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={{ fill: '#059669', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default TransporterDashboard;


