import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackageCheck,
  Loader2,
  Search,
  AlertCircle,
  Plus,
  ShoppingCart,
  ClipboardCheck,
  Eye
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { batchAPI, inspectionAPI } from '../../services/api';
import { InspectionForm, InspectionTimeline } from '../../components/inspection';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';

const Received = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showInspectionTimeline, setShowInspectionTimeline] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchInspections, setBatchInspections] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await batchAPI.list();
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setBatches(data);
      // Fetch inspections for received batches
      const receivedBatches = data.filter(b =>
        b.status === 'DELIVERED_TO_RETAILER' ||
        b.status === 'ARRIVED_AT_RETAILER' ||
        b.status === 'ARRIVAL_CONFIRMED_BY_RETAILER' ||
        b.status === 'LISTED'
      );
      receivedBatches.forEach(batch => fetchBatchInspections(batch.id));
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load received batches');
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

  const hasRetailerInspection = (batchId) => {
    const inspections = batchInspections[batchId] || [];
    return inspections.some(i => i.stage === 'retailer');
  };

  // Filter received batches - delivered to retailer but not yet listed
  const receivedBatches = batches.filter(b => b.status === 'DELIVERED_TO_RETAILER');

  const filteredBatches = receivedBatches.filter(batch => {
    const searchLower = searchTerm.toLowerCase();
    return (
      batch.product_batch_id?.toLowerCase().includes(searchLower) ||
      batch.crop_type?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status) => {
    const statusColors = {
      'DELIVERED_TO_RETAILER': 'bg-emerald-100 text-emerald-700',
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
            <h1 className="text-2xl font-bold text-gray-900">Received Batches</h1>
            <p className="text-gray-600">Batches delivered to your store ready for listing</p>
          </div>
          <button
            onClick={() => navigate('/retailer/listing/new')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Listing
          </button>
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
              placeholder="Search by batch ID or crop type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Received Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 hidden md:table-header-group">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Batch ID</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Crop Type</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <PackageCheck className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">
                          {searchTerm ? 'No batches match your search' : 'No received batches found'}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          Batches will appear here once they are delivered to your store
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50 transition-colors flex flex-col md:table-row border-b md:border-none p-4 md:p-0">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Batch ID:</span>
                        {batch.product_batch_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Crop Type:</span>
                        {batch.crop_type || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">{t('batch.quantity')}:</span>
                        {formatNumber(batch.quantity || 0)} {t('common.kg')}
                      </td>
                      <td className="px-6 py-4 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Status:</span>
                        {getStatusBadge(batch.status)}
                      </td>
                      <td className="px-6 py-4 flex flex-col md:table-cell">
                        <div className="flex gap-2 flex-wrap justify-end md:justify-start">
                          {/* Inspection button for retailer stage */}
                          {!hasRetailerInspection(batch.id) && (
                            <button
                              onClick={() => {
                                setSelectedBatch(batch);
                                setShowInspectionModal(true);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1 w-full sm:w-auto"
                              title="Inspect Batch"
                            >
                              <ClipboardCheck className="w-3 h-3" />
                              Inspect
                            </button>
                          )}
                          {hasRetailerInspection(batch.id) && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded flex items-center gap-1">
                              <ClipboardCheck className="w-3 h-3" />
                              Inspected
                            </span>
                          )}
                          <button
                            onClick={() => navigate('/retailer/listing/new')}
                            className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 flex items-center gap-1 w-full sm:w-auto"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            Create Listing
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBatch(batch);
                              setShowInspectionTimeline(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 ml-auto md:ml-0"
                            title="View Inspection Timeline"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Inspection Form Modal */}
        {showInspectionModal && selectedBatch && (
          <InspectionForm
            batch={selectedBatch}
            stage="retailer"
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
                  <h2 className="text-xl font-bold text-gray-900">Inspection History</h2>
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
      </div>
    </MainLayout>
  );
};

export default Received;
