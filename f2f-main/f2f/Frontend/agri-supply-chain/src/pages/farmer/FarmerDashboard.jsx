import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Plus,
  Package,
  CheckCircle,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Ban,
  Eye,
  ClipboardCheck,
  Calendar,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';
import MainLayout from '../../components/layout/MainLayout';
import { batchAPI, transportAPI, stakeholderAPI, dashboardAPI } from '../../services/api';
import SuspendModal from '../../components/common/SuspendModal';
import { useToast } from '../../context/ToastContext';

// Simple Donut Chart Component
const DonutChart = ({ data, title, colors }) => {
  const { t } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let currentAngle = 0;

  return (
    <div className="bg-white dark:bg-cosmos-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-cosmos-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {total === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <p>{t('dashboard.farmer.noDataAvailable')}</p>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {data.map((item, index) => {
                const percentage = item.count / total;
                const angle = percentage * 360;
                const startAngle = currentAngle;
                currentAngle += angle;

                const startRad = (startAngle * Math.PI) / 180;
                const endRad = ((startAngle + angle) * Math.PI) / 180;

                const x1 = 50 + 40 * Math.cos(startRad);
                const y1 = 50 + 40 * Math.sin(startRad);
                const x2 = 50 + 40 * Math.cos(endRad);
                const y2 = 50 + 40 * Math.sin(endRad);

                const largeArcFlag = angle > 180 ? 1 : 0;

                const pathData = [
                  `M 50 50`,
                  `L ${x1} ${y1}`,
                  `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  `Z`
                ].join(' ');

                return (
                  <path
                    key={index}
                    d={pathData}
                    fill={colors[index % colors.length]}
                    stroke="white"
                    strokeWidth="2"
                  />
                );
              })}
              <circle cx="50" cy="50" r="25" fill="white" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-900">{formatNumber(total)}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="text-gray-600">
                    {item.label || item.crop_type}
                  </span>
                </div>
                <span className="font-medium text-gray-900">{formatNumber(item.count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Bar Chart Component
const BarChart = ({ data, title }) => {
  const { t } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-white dark:bg-cosmos-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-cosmos-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <p>{t('dashboard.farmer.noDataAvailable')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-20 text-sm text-gray-600 truncate" title={item.crop_type}>
                {item.crop_type}
              </div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
              <div className="w-8 text-sm font-medium text-gray-900 text-right">
                {formatNumber(item.count)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Empty State Component
const EmptyState = ({ onCreateClick }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Sprout className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Batches Yet</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        You haven't created any crop batches yet. Start by creating your first batch to track your produce.
      </p>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Create Your First Batch
      </button>
    </div>
  );
};

const getStatusBadge = (batchStatus) => {
  const statusColors = {
    CREATED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    TRANSPORT_REQUESTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    TRANSPORT_REJECTED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    IN_TRANSIT_TO_DISTRIBUTOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ARRIVED_AT_DISTRIBUTOR: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    ARRIVAL_CONFIRMED_BY_DISTRIBUTOR: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    DELIVERED_TO_DISTRIBUTOR: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    STORED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    TRANSPORT_REQUESTED_TO_RETAILER: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    IN_TRANSIT_TO_RETAILER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ARRIVED_AT_RETAILER: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    ARRIVAL_CONFIRMED_BY_RETAILER: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    DELIVERED_TO_RETAILER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    LISTED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    SOLD: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    FULLY_SPLIT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  const colorClass = statusColors[batchStatus] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  return (
    <span className={`px-2 py-1 text-[10px] font-bold rounded-full border border-current opacity-80 ${colorClass}`}>
      {batchStatus?.replace(/_/g, ' ') || 'CREATED'}
    </span>
  );
};

const FarmerDashboard = () => {
  const toast = useToast();
  const { t } = useTranslation();
  const { formatNumber, formatCurrency } = useLocalizedNumber();
  const [batches, setBatches] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchToSuspend, setBatchToSuspend] = useState(null);
  const [suspending, setSuspending] = useState(false);
  const [distributors, setDistributors] = useState([]);
  const [selectedDistributor, setSelectedDistributor] = useState('');
  const [formData, setFormData] = useState({
    crop_type: '',
    quantity: '',
    harvest_date: '',
    farmer_base_price_per_unit: '',
  });

  useEffect(() => {
    fetchDashboardData();
    fetchDistributors();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard analytics from the new endpoint
      const response = await dashboardAPI.getFarmerDashboard();
      const data = response.data.data;

      setDashboardData(data);

      // Update stats from dashboard data
      if (data && data.metrics) {
        setStats({
          total: data.metrics.total_batches,
          active: data.metrics.active_batches,
          completed: data.metrics.completed_batches,
          revenue: data.metrics.total_revenue,
        });
      }

      // Use recent batches from dashboard data
      if (data && data.recent_batches) {
        setBatches(data.recent_batches);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.response?.data?.message || 'Failed to load dashboard data');

      // Fallback to legacy batch list API if dashboard endpoint fails
      try {
        const response = await batchAPI.list();
        const originalBatches = (response.data || []).filter(batch => !batch.is_child_batch);
        setBatches(originalBatches);

        const total = originalBatches.length;
        const active = originalBatches.filter(b => b.status !== 'SUSPENDED' && b.status !== 'SOLD').length;
        const completed = originalBatches.filter(b => b.status === 'SOLD').length;

        setStats({ total, active, completed, revenue: 0 });
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributors = async () => {
    try {
      const response = await stakeholderAPI.listProfiles();
      const distributorList = response.data.filter(profile => profile.role === 'distributor');
      setDistributors(distributorList);
    } catch (error) {
      console.error('Error fetching distributors:', error);
    }
  };

  const handleRequestTransport = async () => {
    if (selectedBatch?.is_locked) {
      toast.warning('Please complete all pending payments before proceeding.');
      return;
    }

    if (!selectedDistributor) {
      toast.warning('Please select a distributor');
      return;
    }

    try {
      await transportAPI.createRequest({
        batch_id: selectedBatch.id,
        distributor_id: selectedDistributor
      });
      setShowTransportModal(false);
      setSelectedBatch(null);
      setSelectedDistributor('');
      fetchDashboardData(); // Refresh to show updated status
      toast.success('Transport request created successfully!');
    } catch (error) {
      console.error('Error creating transport request:', error);
      toast.error(error.response?.data?.message || 'Failed to create transport request');
    }
  };

  const handleSuspendBatch = (batchId) => {
    setBatchToSuspend(batchId);
    setShowSuspendModal(true);
  };

  const confirmSuspend = async (batchId, reason) => {
    try {
      setSuspending(true);
      await batchAPI.suspend(batchId, reason);
      toast.success('Batch suspended successfully.');
      setShowSuspendModal(false);
      setBatchToSuspend(null);
      fetchDashboardData();
    } catch (error) {
      console.error('Error suspending batch:', error);
      toast.error(error.response?.data?.message || 'Failed to suspend batch');
    } finally {
      setSuspending(false);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      // Create payload matching the serializer fields
      const payload = {
        crop_type: formData.crop_type,
        quantity: formData.quantity,
        harvest_date: formData.harvest_date,
        farmer_base_price_per_unit: formData.farmer_base_price_per_unit
      };

      await batchAPI.create(payload);
      setShowCreateForm(false);
      setFormData({
        crop_type: '',
        quantity: '',
        harvest_date: '',
        farmer_base_price_per_unit: '',
      });

      fetchDashboardData();
      toast.success('Batch created successfully');
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error('Error creating batch. Please try again.');
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </MainLayout>
    );
  }

  // Check if farmer has no batches
  const hasNoBatches = !dashboardData?.has_batches && batches.length === 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Farmer Dashboard</h1>
            <p className="text-gray-600">Manage your crop batches and track their progress</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Batch
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {hasNoBatches ? (
          <EmptyState onCreateClick={() => setShowCreateForm(true)} />
        ) : (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('dashboard.farmer.totalBatches')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total)}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('dashboard.farmer.activeBatches')}</p>
                    <p className="text-2xl font-bold text-green-600">{formatNumber(stats.active)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <Sprout className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('dashboard.farmer.completedBatches')}</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatNumber(stats.completed)}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('dashboard.farmer.totalRevenue')}</p>
                    <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.revenue)}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DonutChart
                data={dashboardData?.status_distribution || []}
                title={t('dashboard.farmer.batchDistribution')}
                colors={['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#6B7280', '#EC4899']}
              />
              <BarChart
                data={dashboardData?.crop_distribution || []}
                title={t('dashboard.farmer.batchDistribution')}
              />
            </div>
          </>
        )}

        {/* Create Batch Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Batch</h2>
              <form onSubmit={handleCreateBatch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type *</label>
                    <input
                      type="text"
                      required
                      value={formData.crop_type}
                      onChange={(e) => setFormData({ ...formData, crop_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., Wheat, Rice"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Harvest Date</label>
                    <input
                      type="date"
                      value={formData.harvest_date}
                      onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
                      min={(() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - 3);
                        return d.toISOString().split('T')[0];
                      })()}
                      max={(() => {
                        return new Date().toISOString().split('T')[0];
                      })()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Select a date between 3 months ago and today</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price per Unit (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.farmer_base_price_per_unit}
                      onChange={(e) => setFormData({ ...formData, farmer_base_price_per_unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., 25.50"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Create Batch
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transport Request Modal */}
        {showTransportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Request Transport</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
                  <p className="text-sm text-gray-600">{selectedBatch?.product_batch_id} - {selectedBatch?.crop_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Distributor</label>
                  <select
                    value={selectedDistributor}
                    onChange={(e) => setSelectedDistributor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Choose a distributor...</option>
                    {distributors.map(dist => (
                      <option key={dist.id} value={dist.id}>
                        {dist.user_details?.username || dist.organization || `Distributor ${dist.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowTransportModal(false);
                    setSelectedBatch(null);
                    setSelectedDistributor('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestTransport}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Request Transport
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Suspend Modal */}
        <SuspendModal
          isOpen={showSuspendModal}
          loading={suspending}
          batchId={batchToSuspend}
          onClose={() => {
            setShowSuspendModal(false);
            setBatchToSuspend(null);
          }}
          onConfirm={confirmSuspend}
        />
      </div>
    </MainLayout>
  );
};

export default FarmerDashboard;
