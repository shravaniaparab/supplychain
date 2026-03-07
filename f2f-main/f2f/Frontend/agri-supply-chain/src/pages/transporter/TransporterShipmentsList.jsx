import React, { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  MapPin,
  Navigation,
  Loader2,
  ArrowRight,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Play,
  IndianRupee,
  Eye
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { transportAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';

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

const ActionButton = ({ status, onAccept, onReject, onArrive, onDeliver, t }) => {
  switch (status) {
    case 'PENDING':
      return (
        <div className="flex flex-col gap-2">
          <button
            onClick={onAccept}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
          >
            <CheckCircle className="w-3 h-3" />
            {t('transporter.accept')}
          </button>
          <button
            onClick={onReject}
            className="px-3 py-1.5 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
          >
            <XCircle className="w-3 h-3" />
            {t('transporter.reject')}
          </button>
        </div>
      );
    case 'ACCEPTED':
    case 'IN_TRANSIT':
    case 'IN_TRANSIT_TO_RETAILER':
      return (
        <button
          onClick={onArrive}
          className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1"
        >
          <MapPin className="w-3 h-3" />
          {t('transporter.markArrived')}
        </button>
      );
    case 'ARRIVAL_CONFIRMED':
      return (
        <button
          onClick={onDeliver}
          className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
        >
          <CheckCircle className="w-3 h-3" />
          {t('transporter.markDelivered')}
        </button>
      );
    case 'ARRIVED':
      return (
        <span className="text-xs text-gray-500 italic">Waiting for confirmation</span>
      );
    case 'DELIVERED':
      return (
        <span className="text-xs text-emerald-600 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Completed
        </span>
      );
    default:
      return null;
  }
};

const TransporterShipmentsList = ({
  title,
  filterFn,
  emptyMessage,
  showActions = true
}) => {
  const { t } = useTranslation();
  const { formatCurrency, formatNumber } = useLocalizedNumber();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [transportFee, setTransportFee] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await transportAPI.list();
      setRequests(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching transport requests:', err);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Filter requests based on filterFn prop
  const filteredRequests = requests.filter(filterFn || (() => true));

  // Apply additional search and status filters
  const displayedRequests = filteredRequests.filter(request => {
    const matchesSearch =
      request.batch_details?.product_batch_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.from_party_details?.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.to_party_details?.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.batch_details?.crop_type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (id, newStatus, extraData = {}) => {
    try {
      if (newStatus === 'ACCEPTED') {
        setSelectedRequestId(id);
        setTransportFee('');
        setShowFeeModal(true);
        return;
      } else if (newStatus === 'ARRIVED') {
        await transportAPI.arriveRequest(id);
      } else if (newStatus === 'DELIVERED') {
        await transportAPI.deliverRequest(id);
      } else if (newStatus === 'REJECTED') {
        await transportAPI.rejectRequest(id);
      }
      fetchRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || t('toast.errorGeneric'));
    }
  };

  const handleAcceptWithFee = async () => {
    try {
      const transportFeeVal = parseFloat(transportFee || 0);
      if (isNaN(transportFeeVal) || transportFeeVal < 0) {
        toast.warning(t('errors.required'));
        return;
      }
      await transportAPI.acceptRequest(selectedRequestId, { transporter_fee_per_unit: transportFeeVal });
      setShowFeeModal(false);
      setSelectedRequestId(null);
      setTransportFee('');
      fetchRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error(error.response?.data?.message || t('toast.errorGeneric'));
    }
  };

  const getTypeIcon = (role) => {
    return role === 'farmer' ?
      <Package className="w-4 h-4 text-blue-600" /> :
      <Truck className="w-4 h-4 text-purple-600" />;
  };

  const getTypeLabel = (role) => {
    return role === 'farmer' ? t('roles.farmer') : t('roles.distributor');
  };

  const uniqueStatuses = [...new Set(filteredRequests.map(r => r.status))];

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
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchRequests}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            {t('common.retry')}
          </button>
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
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600">
              {filteredRequests.length} {filteredRequests.length === 1 ? 'shipment' : 'shipments'} found
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="sm:w-48">
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white"
                >
                  <option value="all">{t('common.all')}</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>
                      {status?.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Shipments Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 hidden md:table-header-group">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Batch / Crop</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  {showActions && <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={showActions ? 6 : 5} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <Truck className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">{emptyMessage || t('transporter.noShipments')}</p>
                        {searchTerm && (
                          <p className="text-sm text-gray-400 mt-1">
                            {t('common.noRecordsFound')}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors flex flex-col md:table-row border-b md:border-none p-4 md:p-0">
                      <td className="px-6 py-4 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Batch / Crop:</span>
                        <div className="space-y-1 text-right md:text-left">
                          <span className="font-mono text-sm font-medium text-gray-900 block">
                            {request.batch_details?.product_batch_id || 'N/A'}
                          </span>
                          <span className="text-xs text-gray-500 block">
                            {request.batch_details?.crop_type || 'N/A'} • {formatNumber(request.batch_details?.quantity || 0)} {t('common.kg')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Type:</span>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(request.from_party_details?.role)}
                          <span className="text-sm text-gray-700">
                            {getTypeLabel(request.from_party_details?.role)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Route:</span>
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <div className="flex flex-col items-end md:items-start">
                            <span className="truncate max-w-[120px]" title={request.from_party_details?.address}>
                              {request.from_party_details?.organization || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-400 truncate max-w-[120px]">
                              {request.from_party_details?.address?.split(',')[0]}
                            </span>
                          </div>
                          <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <div className="flex flex-col items-end md:items-start">
                            <span className="truncate max-w-[120px]" title={request.to_party_details?.address}>
                              {request.to_party_details?.organization || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-400 truncate max-w-[120px]">
                              {request.to_party_details?.address?.split(',')[0]}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Fee:</span>
                        <div className="text-right md:text-left">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(request.transporter_fee_per_unit || 0)}
                          </span>
                          <span className="text-xs text-gray-400 block">{t('common.per')} {t('common.kg')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Status:</span>
                        <StatusBadge status={request.status} />
                      </td>
                      {showActions && (
                        <td className="px-6 py-4 flex flex-col md:table-cell">
                          <div className="flex flex-col gap-2 items-end md:items-start">
                            <ActionButton
                              status={request.status}
                              onAccept={() => handleStatusUpdate(request.id, 'ACCEPTED')}
                              onReject={() => handleStatusUpdate(request.id, 'REJECTED')}
                              onArrive={() => handleStatusUpdate(request.id, 'ARRIVED')}
                              onDeliver={() => handleStatusUpdate(request.id, 'DELIVERED')}
                              t={t}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Transport Fee Modal */}
        {showFeeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('transporter.transportFee')}</h2>
              </div>
              <p className="text-gray-600 mb-4">
                {t('transporter.feeDescription')}
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('transporter.transportFee')} ({t('common.per')} {t('common.kg')})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={transportFee}
                    onChange={(e) => setTransportFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFeeModal(false);
                    setSelectedRequestId(null);
                    setTransportFee('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleAcceptWithFee}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {t('buttons.accept')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default TransporterShipmentsList;
