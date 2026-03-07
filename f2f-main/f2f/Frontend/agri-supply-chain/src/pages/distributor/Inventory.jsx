import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Loader2,
  Search,
  AlertCircle,
  Truck,
  Scissors,
  Eye,
  X,
  Plus,
  Archive,
  ClipboardCheck,
  Ban
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { batchAPI, stakeholderAPI, distributorAPI, batchSplitAPI, inspectionAPI } from '../../services/api';
import { InspectionForm, InspectionTimeline } from '../../components/inspection';
import SuspendModal from '../../components/common/SuspendModal';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';

const Inventory = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const [batches, setBatches] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showInspectionTimeline, setShowInspectionTimeline] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchToSuspend, setBatchToSuspend] = useState(null);
  const [suspending, setSuspending] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState('');
  const [splitData, setSplitData] = useState({
    splits: [{ label: '', quantity: '' }]
  });
  const [batchInspections, setBatchInspections] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchesRes, retailersRes] = await Promise.all([
        batchAPI.list(),
        stakeholderAPI.listProfiles({ role: 'retailer', kyc_status: 'approved' }),
      ]);
      setBatches(batchesRes.data);
      setRetailers(retailersRes.data);
      // Fetch inspections for stored batches
      const storedBatches = batchesRes.data.filter(b => b.status === 'STORED');
      storedBatches.forEach(batch => fetchBatchInspections(batch.id));
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTransport = async () => {
    if (selectedBatch?.is_locked) {
      toast.warning(t('toast.paymentPending'));
      return;
    }

    if (!selectedBatch || !selectedRetailer) {
      toast.warning(t('toast.selectDistributor'));
      return;
    }

    try {
      await distributorAPI.requestTransportToRetailer({
        batch_id: selectedBatch.id,
        retailer_id: selectedRetailer,
      });
      toast.success(t('toast.transportRequested'));
      setShowTransportModal(false);
      setSelectedBatch(null);
      setSelectedRetailer('');
      fetchData();
    } catch (error) {
      console.error('Error requesting transport:', error);
      toast.error(error.response?.data?.message || t('toast.transportFailed'));
    }
  };

  const handleSplitBatch = (batch) => {
    if (batch.is_locked) {
      toast.warning(t('toast.paymentPending'));
      return;
    }

    setSelectedBatch(batch);
    setShowSplitModal(true);
    setSplitData({ splits: [{ label: '', quantity: '' }] });
  };

  const handleAddSplit = () => {
    setSplitData({
      splits: [...splitData.splits, { label: '', quantity: '' }]
    });
  };

  const handleSplitChange = (index, field, value) => {
    const newSplits = [...splitData.splits];
    newSplits[index][field] = value;
    setSplitData({ splits: newSplits });
  };

  const handleRemoveSplit = (index) => {
    if (splitData.splits.length > 1) {
      const newSplits = splitData.splits.filter((_, i) => i !== index);
      setSplitData({ splits: newSplits });
    }
  };

  const handleSubmitSplit = async () => {
    const totalQuantity = splitData.splits.reduce((sum, split) => sum + (parseFloat(split.quantity) || 0), 0);
    const parentQuantity = parseFloat(selectedBatch.quantity);

    if (Math.abs(totalQuantity - parentQuantity) > 0.001) {
      toast.warning(`Total split quantity (${totalQuantity} kg) must exactly match parent batch quantity (${parentQuantity} kg)`);
      return;
    }

    for (let i = 0; i < splitData.splits.length; i++) {
      const split = splitData.splits[i];
      if (!split.label || !split.quantity) {
        toast.warning(`Please fill all fields for split ${i + 1}`);
        return;
      }
    }

    try {
      await batchAPI.bulkSplit(selectedBatch.id, {
        splits: splitData.splits.map(s => ({
          label: s.label,
          quantity: parseFloat(s.quantity),
          notes: `Split from ${selectedBatch.product_batch_id}`
        }))
      });

      toast.success(t('toast.splitCreated', { id: selectedBatch.product_batch_id, count: splitData.splits.length }));
      setShowSplitModal(false);
      setSelectedBatch(null);
      fetchData();
    } catch (error) {
      console.error('Error splitting batch:', error);
      toast.error(error.response?.data?.message || t('toast.splitFailed'));
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
      toast.success(t('toast.suspendSuccess'));
      setShowSuspendModal(false);
      setBatchToSuspend(null);
      fetchData();
    } catch (error) {
      console.error('Error suspending batch:', error);
      toast.error(error.response?.data?.message || t('toast.suspendError'));
    } finally {
      setSuspending(false);
    }
  };

  const fetchBatchInspections = async (batchId) => {
    try {
      const response = await inspectionAPI.getBatchTimeline(batchId);
      setBatchInspections(prev => ({
        ...prev,
        [batchId]: response.data
      }));
    } catch (err) {
      console.log(`No inspections for batch ${batchId}`);
    }
  };

  const hasDistributorInspection = (batchId) => {
    const inspections = batchInspections[batchId] || [];
    return inspections.some(i => i.stage === 'distributor');
  };

  // Filter inventory batches
  const inventoryBatches = batches.filter(b =>
    b.status === 'STORED' || b.status === 'FULLY_SPLIT'
  ).sort((a, b) => {
    if (a.id === b.parent_batch) return -1;
    if (b.id === a.parent_batch) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const filteredBatches = inventoryBatches.filter(batch => {
    const searchLower = searchTerm.toLowerCase();
    return (
      batch.product_batch_id?.toLowerCase().includes(searchLower) ||
      batch.crop_type?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status) => {
    const statusColors = {
      'STORED': 'bg-emerald-100 text-emerald-700',
      'FULLY_SPLIT': 'bg-purple-100 text-purple-700',
    };
    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-700';
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {status?.replace(/_/g, ' ')}
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
            <h1 className="text-2xl font-bold text-gray-900">{t('distributor.inventory')}</h1>
            <p className="text-gray-600">{t('distributor.inventorySubtitle')}</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('batch.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Inventory Table — Hybrid Layout */}
        <div className="space-y-4">
          {filteredBatches.length === 0 ? (
            <div className="bg-white dark:bg-cosmos-800 rounded-2xl border border-dashed border-gray-200 dark:border-cosmos-700 p-12 text-center">
              <Archive className="w-12 h-12 text-gray-300 dark:text-cosmos-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-cosmos-400 font-medium">
                {searchTerm ? t('batch.noMatchSearch') : t('distributor.noInventory')}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block bg-white dark:bg-cosmos-800 rounded-2xl border border-emerald-100 dark:border-cosmos-700 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-emerald-50 dark:bg-cosmos-900 border-b border-emerald-100 dark:border-cosmos-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">{t('batch.batchId')}</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">{t('batch.cropType')}</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">{t('batch.quantity')}</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">{t('common.status')}</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 dark:divide-cosmos-700">
                    {filteredBatches.map((batch) => (
                      <tr key={batch.id} className={`hover:bg-emerald-50/30 dark:hover:bg-cosmos-900/50 transition-colors ${batch.is_child_batch ? 'bg-gray-50/50 dark:bg-cosmos-900/30' : ''}`}>
                        <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-cosmos-400">
                          <div className="flex items-center">
                            {batch.is_child_batch && <span className="text-gray-400 mr-2">└─</span>}
                            {batch.product_batch_id}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white capitalize">
                          {batch.crop_type || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-cosmos-300">
                          {formatNumber(batch.quantity || 0)} {t('common.kg')}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(batch.status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {batch.status === 'STORED' && (
                              <>
                                <button
                                  onClick={() => { setSelectedBatch(batch); setShowTransportModal(true); }}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  {t('buttons.requestTransport')}
                                </button>
                                <button
                                  onClick={() => handleSplitBatch(batch)}
                                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                                >
                                  <Scissors className="w-3.5 h-3.5" />
                                  {t('buttons.splitBatch')}
                                </button>
                                <button
                                  onClick={() => { setSelectedBatch(batch); setShowInspectionTimeline(true); }}
                                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  {t('common.history')}
                                </button>
                                <button
                                  onClick={() => handleSuspendBatch(batch.id)}
                                  className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1.5"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  {t('common.suspend')}
                                </button>
                              </>
                            )}
                            {batch.status === 'FULLY_SPLIT' && (
                              <span className="text-xs text-gray-400 italic">{t('batch.parentBatch')}</span>
                            )}
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
                    className="bg-white dark:bg-cosmos-800 rounded-2xl border border-emerald-100 dark:border-cosmos-700 shadow-sm p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] text-gray-400 dark:text-cosmos-400 bg-gray-50 dark:bg-cosmos-900 px-2 py-0.5 rounded">
                        {batch.is_child_batch && 'Child: '}#{batch.product_batch_id}
                      </span>
                      {getStatusBadge(batch.status)}
                    </div>

                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                        {batch.crop_type || 'Unknown'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-cosmos-400 font-medium">
                        {formatNumber(batch.quantity || 0)} {t('common.kg')}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {batch.status === 'STORED' && (
                        <>
                          <button
                            onClick={() => { setSelectedBatch(batch); setShowTransportModal(true); }}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg font-bold flex items-center justify-center gap-1"
                          >
                            <Truck className="w-3 h-3" />
                            {t('nav.distributor_shipments')}
                          </button>
                          <button
                            onClick={() => handleSplitBatch(batch)}
                            className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs rounded-lg font-bold flex items-center justify-center gap-1"
                          >
                            <Scissors className="w-3 h-3" />
                            {t('buttons.splitBatch')}
                          </button>
                          <div className="w-full flex gap-2">
                            <button
                              onClick={() => { setSelectedBatch(batch); setShowInspectionTimeline(true); }}
                              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-cosmos-700 text-gray-700 dark:text-cosmos-300 text-xs rounded-lg font-bold flex items-center justify-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              {t('common.history')}
                            </button>
                            <button
                              onClick={() => handleSuspendBatch(batch.id)}
                              className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-lg font-bold"
                            >
                              <Ban className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                      {batch.status === 'FULLY_SPLIT' && (
                        <p className="text-sm text-gray-400 italic w-full text-center py-2">{t('batch.parentBatch')} ({t('common.inactive')})</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Transport Modal */}
        {showTransportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">{t('distributor.outgoingBatches')}</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('batch.selectRetailer')}
                </label>
                <select
                  value={selectedRetailer}
                  onChange={(e) => setSelectedRetailer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">{t('batch.chooseRetailer')}</option>
                  {retailers.map((retailer) => (
                    <option key={retailer.id} value={retailer.id}>
                      {retailer.user_details?.username || retailer.organization || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTransportModal(false);
                    setSelectedBatch(null);
                    setSelectedRetailer('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleRequestTransport}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  {t('buttons.requestTransport')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Split Batch Modal */}
        {showSplitModal && selectedBatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">{t('buttons.splitBatch')}: {selectedBatch.product_batch_id}</h3>
                  <button
                    onClick={() => setShowSplitModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{t('batch.parentBatch')}:</strong> {selectedBatch.crop_type} - {formatNumber(selectedBatch.quantity)} {t('common.kg')}
                  </p>
                  <div className="flex justify-between mt-2 pt-2 border-t border-blue-100">
                    <p className="text-sm font-semibold text-blue-900">
                      {t('batch.remaining')}: {formatNumber(parseFloat(selectedBatch.quantity) - splitData.splits.reduce((sum, s) => sum + (parseFloat(s.quantity) || 0), 0))} {t('common.kg')}
                    </p>
                    <p className="text-sm font-semibold text-blue-900">
                      {t('common.total')}: {formatNumber(splitData.splits.reduce((sum, s) => sum + (parseFloat(s.quantity) || 0), 0))} / {formatNumber(selectedBatch.quantity)} {t('common.kg')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {splitData.splits.map((split, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Child Batch {index + 1}</h4>
                        {splitData.splits.length > 1 && (
                          <button
                            onClick={() => handleRemoveSplit(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            {t('common.remove')}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('common.label')} *
                          </label>
                          <input
                            type="text"
                            value={split.label}
                            onChange={(e) => handleSplitChange(index, 'label', e.target.value)}
                            placeholder="e.g., Split A"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('batch.quantity')} ({t('common.kg')}) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={split.quantity}
                            onChange={(e) => handleSplitChange(index, 'quantity', e.target.value)}
                            placeholder="e.g., 200"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleAddSplit}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t('buttons.addSplit')}
                  </button>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowSplitModal(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleSubmitSplit}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      {t('buttons.splitBatch')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inspection Form Modal */}
        {showInspectionModal && selectedBatch && (
          <InspectionForm
            batch={selectedBatch}
            stage="distributor"
            onClose={() => {
              setShowInspectionModal(false);
              setSelectedBatch(null);
            }}
            onSuccess={() => {
              fetchBatchInspections(selectedBatch.id);
              fetchData();
            }}
          />
        )}

        {/* Inspection Timeline Modal */}
        {showInspectionTimeline && selectedBatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('distributor.inspectionHistory')}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedBatch.product_batch_id} - {selectedBatch.crop_type}
                  </p>
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

export default Inventory;
