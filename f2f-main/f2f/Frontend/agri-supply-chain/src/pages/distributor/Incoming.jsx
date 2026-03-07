import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Loader2,
  MapPin,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Store,
  ClipboardCheck,
  Eye,
  Ban
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { batchAPI, transportAPI, distributorAPI, inspectionAPI } from '../../services/api';
import { InspectionForm, InspectionTimeline } from '../../components/inspection';
import SuspendModal from '../../components/common/SuspendModal';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';

const Incoming = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const [batches, setBatches] = useState([]);
  const [transportRequests, setTransportRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showInspectionTimeline, setShowInspectionTimeline] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchToSuspend, setBatchToSuspend] = useState(null);
  const [suspending, setSuspending] = useState(false);
  const [storeMargin, setStoreMargin] = useState('0.00');
  const [batchInspections, setBatchInspections] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchesRes, transportRes] = await Promise.all([
        batchAPI.list(),
        transportAPI.list(),
      ]);
      setBatches(batchesRes.data);
      setTransportRequests(transportRes.data);
      // Fetch inspections for incoming batches
      const incomingBatchIds = [
        ...transportRes.data
          .filter(tr => tr.to_party_details?.role === 'distributor' && tr.batch)
          .map(tr => tr.batch),
        ...batchesRes.data.filter(b => b.status === 'DELIVERED_TO_DISTRIBUTOR').map(b => b.id)
      ];
      incomingBatchIds.forEach(id => fetchBatchInspections(id));
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
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

  const handleConfirmArrival = async (requestId) => {
    const request = transportRequests.find(tr => tr.id === requestId);
    if (request?.batch_details?.is_locked) {
      toast.warning(t('toast.paymentPending'));
      return;
    }

    try {
      await transportAPI.confirmArrivalRequest(requestId);
      toast.success(t('toast.arrivalConfirmed'));
      fetchData();
    } catch (error) {
      console.error('Error confirming arrival:', error);
      toast.error(error.response?.data?.message || t('toast.errorGeneric'));
    }
  };

  const handleStoreBatch = async () => {
    if (selectedBatch?.is_locked || selectedBatch?.batch_details?.is_locked) {
      toast.warning(t('toast.paymentPending'));
      return;
    }

    try {
      const distributorMargin = parseFloat(storeMargin);
      if (isNaN(distributorMargin)) {
        toast.warning(t('errors.required'));
        return;
      }
      await distributorAPI.storeBatch(selectedBatch.id, { distributor_margin_per_unit: distributorMargin });
      toast.success(t('toast.batchStored'));
      setShowStoreModal(false);
      setSelectedBatch(null);
      setStoreMargin('0.00');
      fetchData();
    } catch (error) {
      console.error('Error storing batch:', error);
      toast.error(error.response?.data?.message || t('toast.storeFailed'));
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

  // Categorize items - only show incoming
  const CATEGORIES = {
    incoming: [
      ...transportRequests.filter(tr =>
        tr.to_party_details?.role === 'distributor' &&
        ['IN_TRANSIT_TO_DISTRIBUTOR', 'ARRIVED_AT_DISTRIBUTOR', 'ARRIVAL_CONFIRMED_BY_DISTRIBUTOR', 'ARRIVED', 'IN_TRANSIT'].includes(tr.status)
      ),
      ...batches.filter(b =>
        ['IN_TRANSIT_TO_DISTRIBUTOR', 'ARRIVED_AT_DISTRIBUTOR', 'DELIVERED_TO_DISTRIBUTOR', 'ARRIVAL_CONFIRMED_BY_DISTRIBUTOR'].includes(b.status)
      )
    ]
  };

  const currentItems = CATEGORIES.incoming || [];

  const filteredItems = currentItems.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const batchId = item.batch_details?.product_batch_id || item.product_batch_id || '';
    const cropType = item.batch_details?.crop_type || item.crop_type || '';
    return (
      batchId.toLowerCase().includes(searchLower) ||
      cropType.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status) => {
    const statusColors = {
      'ARRIVED_AT_DISTRIBUTOR': 'bg-indigo-100 text-indigo-700',
      'ARRIVAL_CONFIRMED_BY_DISTRIBUTOR': 'bg-purple-100 text-purple-700',
      'DELIVERED_TO_DISTRIBUTOR': 'bg-green-100 text-green-700',
      'IN_TRANSIT_TO_DISTRIBUTOR': 'bg-amber-100 text-amber-700',
      'ARRIVED': 'bg-indigo-100 text-indigo-700',
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
            <h1 className="text-2xl font-bold text-gray-900">{t('distributor.incomingBatches')}</h1>
            <p className="text-gray-600">{t('distributor.incomingSubtitle')}</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="bg-white dark:bg-cosmos-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-cosmos-700">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('batch.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-cosmos-600 dark:bg-cosmos-900 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-white"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-cosmos-800 rounded-xl shadow-sm border border-gray-100 dark:border-cosmos-700 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-cosmos-900 border-b border-gray-100 dark:border-cosmos-700">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">{t('batch.batchId')}</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">{t('batch.cropType')}</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">{t('batch.quantity')}</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">{t('common.source')}</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">{t('common.status')}</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-cosmos-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <Package className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 dark:text-cosmos-400 font-medium">{t('distributor.noIncomingBatches')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-cosmos-900/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900 dark:text-cosmos-300">
                        {item.batch_details?.product_batch_id || item.product_batch_id || `TR-${item.id}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white capitalize font-bold">
                        {item.batch_details?.crop_type || item.crop_type || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-cosmos-400">
                        {formatNumber(item.quantity || item.batch_details?.quantity || 0)} {t('common.kg')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-cosmos-400">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{item.from_party_details?.organization || item.from_party_details?.user_details?.username || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(item.status === 'ARRIVED_AT_DISTRIBUTOR' || item.status === 'ARRIVED') && (
                            <button
                              onClick={() => handleConfirmArrival(item.id)}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              {t('buttons.confirmArrival')}
                            </button>
                          )}
                          {item.status === 'DELIVERED_TO_DISTRIBUTOR' && (
                            <>
                              {!hasDistributorInspection(item.batch || item.batch_details?.id || item.id) ? (
                                <button
                                  onClick={() => { setSelectedBatch(item); setShowInspectionModal(true); }}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 flex items-center gap-1"
                                  title={t('distributor.inspect')}
                                >
                                  <ClipboardCheck className="w-3 h-3" />
                                  Inspect
                                </button>
                              ) : (
                                <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1" title={t('distributor.inspected')}>
                                  <CheckCircle className="w-3 h-3" />
                                  Inspected
                                </span>
                              )}
                              <button
                                onClick={() => { setSelectedBatch(item); setShowStoreModal(true); }}
                                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                                title={t('distributor.store')}
                              >
                                <Store className="w-3 h-3" />
                                Store
                              </button>
                              <button
                                onClick={() => handleSuspendBatch(item.id)}
                                className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 flex items-center gap-1"
                                title={t('common.suspend')}
                              >
                                <Ban className="w-3 h-3" />
                                Suspend
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => { setSelectedBatch(item); setShowInspectionTimeline(true); }}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 flex items-center gap-1"
                            title={t('common.history')}
                          >
                            <Eye className="w-3 h-3" />
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-gray-100 dark:divide-cosmos-700">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{t('distributor.noIncomingBatches')}</div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs text-gray-400 dark:text-cosmos-400 bg-gray-50 dark:bg-cosmos-900 px-2 py-0.5 rounded">
                      #{item.batch_details?.product_batch_id || item.product_batch_id || `TR-${item.id}`}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                        {item.batch_details?.crop_type || item.crop_type || 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-cosmos-400">{formatNumber(item.quantity || item.batch_details?.quantity || 0)} {t('common.kg')}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 dark:text-cosmos-400">
                      <div className="flex items-center gap-1 justify-end">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{item.from_party_details?.organization || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => { setSelectedBatch(item); setShowInspectionTimeline(true); }}
                      className="px-3 py-1.5 border border-gray-200 dark:border-cosmos-600 text-gray-600 dark:text-cosmos-400 rounded-lg text-xs"
                    >
                      {t('common.history')}
                    </button>
                    {(item.status === 'ARRIVED_AT_DISTRIBUTOR' || item.status === 'ARRIVED') && (
                      <button
                        onClick={() => handleConfirmArrival(item.id)}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg"
                      >
                        {t('buttons.confirmArrival')}
                      </button>
                    )}
                    {item.status === 'DELIVERED_TO_DISTRIBUTOR' && (
                      <>
                        <button
                          onClick={() => { setSelectedBatch(item); setShowInspectionModal(true); }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs"
                        >
                          {t('distributor.inspect')}
                        </button>
                        <button
                          onClick={() => { setSelectedBatch(item); setShowStoreModal(true); }}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs"
                        >
                          {t('distributor.store')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Store Batch Modal */}
        {showStoreModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">{t('distributor.storeBatch')}: {selectedBatch?.product_batch_id}</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('distributor.storageMargin')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={storeMargin}
                    onChange={(e) => setStoreMargin(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  {t('distributor.marginDescription')}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowStoreModal(false);
                    setSelectedBatch(null);
                    setStoreMargin('0.00');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleStoreBatch}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  {t('distributor.storeBatch')}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Inspection Form Modal */}
        {showInspectionModal && selectedBatch && (
          <InspectionForm
            batch={selectedBatch.batch_details || selectedBatch}
            stage="distributor"
            onClose={() => {
              setShowInspectionModal(false);
              setSelectedBatch(null);
            }}
            onSuccess={() => {
              const batchId = selectedBatch.batch || selectedBatch.batch_details?.id || selectedBatch.id;
              if (batchId) {
                fetchBatchInspections(batchId);
              }
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
                    {(selectedBatch.batch_details?.product_batch_id || selectedBatch.product_batch_id || 'Unknown')} -
                    {(selectedBatch.batch_details?.crop_type || selectedBatch.crop_type || 'N/A')}
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
                batchId={selectedBatch.batch || selectedBatch.batch_details?.id || selectedBatch.id}
                inspections={batchInspections[selectedBatch.batch || selectedBatch.batch_details?.id || selectedBatch.id]}
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

export default Incoming;
