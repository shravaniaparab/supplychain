import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';
import {
  Sprout,
  Plus,
  Search,
  Eye,
  AlertCircle,
  Loader2,
  ClipboardCheck,
  MapPin,
  Calendar,
  Package,
  ChevronRight,
  Ban
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { batchAPI, transportAPI, stakeholderAPI, dashboardAPI } from '../../services/api';
import { InspectionForm, InspectionTimeline } from '../../components/inspection';
import ProductDescriptionForm from '../../components/inspection/ProductDescriptionForm';
import SuspendModal from '../../components/common/SuspendModal';
import { useToast } from '../../context/ToastContext';

const FarmerBatches = () => {
  const toast = useToast();
  const { t } = useTranslation();
  const { formatNumber, formatCurrency, locale } = useLocalizedNumber();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showInspectionTimeline, setShowInspectionTimeline] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchToSuspend, setBatchToSuspend] = useState(null);
  const [suspending, setSuspending] = useState(false);
  const [distributors, setDistributors] = useState([]);
  const [selectedDistributor, setSelectedDistributor] = useState('');
  const [batchInspections, setBatchInspections] = useState({});
  const [formData, setFormData] = useState({
    crop_type: '',
    quantity: '',
    harvest_date: '',
    farmer_base_price_per_unit: '',
  });

  useEffect(() => {
    fetchBatches();
    fetchDistributors();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try dashboard API first
      try {
        const response = await dashboardAPI.getFarmerDashboard();
        const data = response.data.data;
        if (data && data.recent_batches) {
          setBatches(data.recent_batches);
          // Fetch inspections for each batch
          data.recent_batches.forEach(batch => fetchBatchInspections(batch.id));
        } else {
          throw new Error('No batches data');
        }
      } catch (dashboardErr) {
        // Fallback to batch list API
        const response = await batchAPI.list();
        const originalBatches = (response.data || []).filter(batch => !batch.is_child_batch);
        setBatches(originalBatches);
        // Fetch inspections for each batch
        originalBatches.forEach(batch => fetchBatchInspections(batch.id));
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      setError(error.response?.data?.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchInspections = async (batchId) => {
    try {
      const { inspectionAPI } = await import('../../services/api');
      const response = await inspectionAPI.getBatchTimeline(batchId);
      setBatchInspections(prev => ({
        ...prev,
        [batchId]: response.data
      }));
    } catch (err) {
      // Silently fail - inspections are optional
      console.log(`No inspections for batch ${batchId}`);
    }
  };

  const hasFarmerDescription = (batchId) => {
    const inspections = batchInspections[batchId] || [];
    return inspections.some(i => i.stage === 'farmer');
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
      fetchBatches();
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
      fetchBatches();
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
      fetchBatches();
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error('Error creating batch. Please try again.');
    }
  };

  const filteredBatches = batches.filter(batch => {
    const searchLower = searchTerm.toLowerCase();
    return (
      batch.crop_type?.toLowerCase().includes(searchLower) ||
      batch.product_batch_id?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (batchStatus) => {
    const statusColors = {
      CREATED: 'bg-emerald-100 text-emerald-700',
      TRANSPORT_REQUESTED: 'bg-yellow-100 text-yellow-700',
      TRANSPORT_REJECTED: 'bg-orange-100 text-orange-700',
      IN_TRANSIT_TO_DISTRIBUTOR: 'bg-blue-100 text-blue-700',
      ARRIVED_AT_DISTRIBUTOR: 'bg-indigo-100 text-indigo-700',
      ARRIVAL_CONFIRMED_BY_DISTRIBUTOR: 'bg-violet-100 text-violet-700',
      DELIVERED_TO_DISTRIBUTOR: 'bg-green-100 text-green-700',
      STORED: 'bg-gray-100 text-gray-700',
      TRANSPORT_REQUESTED_TO_RETAILER: 'bg-yellow-100 text-yellow-700',
      IN_TRANSIT_TO_RETAILER: 'bg-blue-100 text-blue-700',
      ARRIVED_AT_RETAILER: 'bg-indigo-100 text-indigo-700',
      ARRIVAL_CONFIRMED_BY_RETAILER: 'bg-violet-100 text-violet-700',
      DELIVERED_TO_RETAILER: 'bg-green-100 text-green-700',
      LISTED: 'bg-cyan-100 text-cyan-700',
      SOLD: 'bg-emerald-100 text-emerald-700',
      SUSPENDED: 'bg-red-100 text-red-700',
      FULLY_SPLIT: 'bg-purple-100 text-purple-700',
    };
    const colorClass = statusColors[batchStatus] || 'bg-gray-100 text-gray-700';
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {batchStatus?.replace(/_/g, ' ') || 'CREATED'}
      </span>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Batches</h1>
            <p className="text-gray-600">Manage and track all your crop batches</p>
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

        {/* Search */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search batches by crop type or batch ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Batches — Card Layout (mobile-first, no horizontal scroll) */}
        {filteredBatches.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-cosmos-700 rounded-full flex items-center justify-center mb-4">
              <Sprout className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-gray-500 dark:text-cosmos-400 font-medium text-lg">
              {searchTerm ? 'No batches match your search' : 'No batches yet'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 px-5 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 font-medium"
              >
                Create Your First Batch
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View - Styled like Payments Page */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('farmerBatches.batchId')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('farmerBatches.crop')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('farmerBatches.quantity')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('farmerBatches.pricePerKg')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('farmerBatches.harvestDate')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('farmerBatches.status')}</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">{t('farmerBatches.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          #{batch.public_batch_id || batch.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 capitalize">
                          {batch.crop_type || t('common.na')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {formatNumber(batch.quantity || 0)} {t('common.kg')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(batch.farmer_base_price_per_unit || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : t('common.na')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(batch.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {batch.status === 'CREATED' && !hasFarmerDescription(batch.id) && (
                            <button
                              onClick={() => { setSelectedBatch(batch); setShowDescriptionModal(true); }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 font-medium"
                            >
                              <ClipboardCheck className="w-3 h-3" />
                              Describe
                            </button>
                          )}
                          {batch.status === 'CREATED' && (
                            <button
                              onClick={() => { setSelectedBatch(batch); setShowTransportModal(true); }}
                              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-lg hover:bg-blue-100 font-medium border border-blue-200 dark:border-blue-800"
                            >
                              Request Transport
                            </button>
                          )}
                          {['CREATED', 'TRANSPORT_REQUESTED', 'TRANSPORT_REJECTED'].includes(batch.status) && (
                            <button
                              onClick={() => handleSuspendBatch(batch.id)}
                              className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg hover:bg-red-100 font-medium border border-red-200 dark:border-red-800"
                            >
                              Suspend
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedBatch(batch); setShowInspectionTimeline(true); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-gray-500 dark:text-cosmos-400 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-cosmos-700 border border-gray-200 dark:border-cosmos-600"
                          >
                            <Eye className="w-3 h-3" />
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="bg-white dark:bg-cosmos-800 rounded-2xl border border-emerald-100 dark:border-cosmos-700 shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-gray-400 dark:text-cosmos-400 bg-gray-50 dark:bg-cosmos-900 px-2 py-0.5 rounded">
                      #{batch.public_batch_id || batch.id}
                    </span>
                    {getStatusBadge(batch.status)}
                  </div>

                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                        {batch.crop_type || 'Unknown Crop'}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-cosmos-400 mt-0.5">
                        <Package className="w-3.5 h-3.5" />
                        <span>{formatNumber(batch.quantity || 0)} {t('common.kg')}</span>
                      </div>
                    </div>
                    {batch.farmer_base_price_per_unit && (
                      <div className="text-right">
                        <p className="text-xs text-gray-400 dark:text-cosmos-400">{t('batch.basePrice')}</p>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(batch.farmer_base_price_per_unit)}/{t('common.kg')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-cosmos-400 mb-3 pb-3 border-b border-gray-100 dark:border-cosmos-700">
                    {batch.farm_location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{batch.farm_location}</span>
                      </span>
                    )}
                    {batch.harvest_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        {new Date(batch.harvest_date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {batch.status === 'CREATED' && !hasFarmerDescription(batch.id) && (
                      <button
                        onClick={() => { setSelectedBatch(batch); setShowDescriptionModal(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 font-medium"
                      >
                        <ClipboardCheck className="w-3 h-3" />
                        Describe
                      </button>
                    )}
                    {batch.status === 'CREATED' && hasFarmerDescription(batch.id) && (
                      <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-cosmos-700 text-emerald-700 dark:text-emerald-400 text-xs rounded-lg font-medium">
                        <ClipboardCheck className="w-3 h-3" />
                        Described ✓
                      </span>
                    )}
                    {batch.status === 'CREATED' && (
                      <button
                        onClick={() => { setSelectedBatch(batch); setShowTransportModal(true); }}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-lg hover:bg-blue-100 font-medium border border-blue-200 dark:border-blue-800"
                      >
                        Request Transport
                      </button>
                    )}
                    {['CREATED', 'TRANSPORT_REQUESTED', 'TRANSPORT_REJECTED'].includes(batch.status) && (
                      <button
                        onClick={() => handleSuspendBatch(batch.id)}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg hover:bg-red-100 font-medium border border-red-200 dark:border-red-800"
                      >
                        Suspend
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedBatch(batch); setShowInspectionTimeline(true); }}
                      className="ml-auto flex items-center gap-1 px-3 py-1.5 text-gray-500 dark:text-cosmos-400 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-cosmos-700 border border-gray-200 dark:border-cosmos-600"
                      title="View Inspection Timeline"
                    >
                      <Eye className="w-3 h-3" />
                      History
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                    <div className="relative">
                      <input
                        type="number"
                        required
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="1000"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">kg</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Harvest Date</label>
                    <input
                      type="date"
                      value={formData.harvest_date}
                      onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
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
        {
          showTransportModal && (
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
          )
        }
        {/* Product Description Form Modal */}
        {
          showDescriptionModal && selectedBatch && (
            <ProductDescriptionForm
              batch={selectedBatch}
              onClose={() => {
                setShowDescriptionModal(false);
                setSelectedBatch(null);
              }}
              onSuccess={() => {
                fetchBatchInspections(selectedBatch.id);
                fetchBatches();
              }}
            />
          )
        }

        {/* Inspection Form Modal - for other stages if needed */}
        {
          showInspectionModal && selectedBatch && (
            <InspectionForm
              batch={selectedBatch}
              stage="farmer"
              onClose={() => {
                setShowInspectionModal(false);
                setSelectedBatch(null);
              }}
              onSuccess={() => {
                fetchBatchInspections(selectedBatch.id);
                fetchBatches();
              }}
            />
          )
        }

        {/* Inspection Timeline Modal */}
        {
          showInspectionTimeline && selectedBatch && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Inspection History</h2>
                    <p className="text-sm text-gray-500">{selectedBatch.product_batch_id} - {selectedBatch.crop_type}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowInspectionTimeline(false);
                      setSelectedBatch(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="text-gray-500">✕</span>
                  </button>
                </div>
                <InspectionTimeline
                  batchId={selectedBatch.id}
                  inspections={batchInspections[selectedBatch.id]}
                />
              </div>
            </div>
          )
        }
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
      </div >
    </MainLayout >
  );
};

export default FarmerBatches;
