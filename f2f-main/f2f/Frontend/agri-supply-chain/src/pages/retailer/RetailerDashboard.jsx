import React, { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  ShoppingCart,
  IndianRupee,
  CheckCircle,
  Loader2,
  TrendingUp,
  Activity,
  AlertCircle,
  Store
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
  Legend
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';
import MainLayout from '../../components/layout/MainLayout';
import { dashboardAPI } from '../../services/api';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];

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

const RetailerDashboard = () => {
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
      const response = await dashboardAPI.getRetailerAnalytics();
      setAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const inventoryChartData = analytics?.inventory_distribution
    ? Object.entries(analytics.inventory_distribution).map(([crop, data]) => ({
      name: crop,
      value: data.value,
      count: data.count
    }))
    : [];

  const monthlySalesData = analytics?.monthly_sales?.months?.map((month, index) => ({
    month,
    revenue: analytics.monthly_sales.revenue[index] || 0
  })) || [];

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            {t('common.retry')}
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.retailerTitle')}</h1>
          <p className="text-gray-600">{t('dashboard.retailerSubtitle')}</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title={t('dashboard.incomingShipments')}
            value={metrics.incoming_shipments || 0}
            icon={Truck}
            color="bg-amber-500"
            subtext={t('dashboard.awaitingConfirmation')}
          />
          <MetricCard
            title={t('dashboard.inventoryValue')}
            value={formatCurrency(metrics.inventory_value || 0)}
            icon={Package}
            color="bg-blue-500"
            subtext={t('dashboard.activeListingsWorth')}
          />
          <MetricCard
            title={t('dashboard.totalListings')}
            value={metrics.active_listings || 0}
            icon={ShoppingCart}
            color="bg-purple-500"
            subtext={t('dashboard.activeForSale')}
          />
          <MetricCard
            title={t('dashboard.totalSalesRevenue')}
            value={formatCurrency(metrics.total_sales_revenue || 0)}
            icon={IndianRupee}
            color="bg-green-600"
            subtext={t('dashboard.earningsToDate')}
          />
          <MetricCard
            title={t('dashboard.unitsSold')}
            value={metrics.units_sold || 0}
            icon={CheckCircle}
            color="bg-emerald-500"
            subtext={t('dashboard.completedSalesLabel')}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Distribution Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('dashboard.inventoryDistribution')}</h3>
            {inventoryChartData.length > 0 ? (
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryChartData}
                      cx="35%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {inventoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value), 'Value']} />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      formatter={(value, entry) => (
                        <span className="text-sm text-gray-600">
                          {value} ({entry.payload.count} items)
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Store className="w-12 h-12 mx-auto mb-2" />
                  <p>{t('dashboard.noInventoryData')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Monthly Sales Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('dashboard.monthlySales')}</h3>
            {monthlySalesData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySalesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000) + 'k' : value}`}
                    />
                    <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                    <Bar dataKey="revenue" name="Sales Revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                  <p>{t('dashboard.noSalesData')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {!metrics.active_listings && !metrics.units_sold && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.welcomeDashboard')}</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {t('dashboard.welcomeSubtext')}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default RetailerDashboard;
