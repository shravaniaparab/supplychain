import React, { useState, useEffect } from 'react';
import {
  Truck,
  Loader2,
  Search,
  AlertCircle,
  MapPin,
  Navigation,
  Clock,
  CheckCircle
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { transportAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const IncomingTransport = () => {
  const toast = useToast();
  const [transportRequests, setTransportRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await transportAPI.list();
      setTransportRequests(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load incoming shipments');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmArrival = async (requestId) => {
    const request = transportRequests.find(tr => tr.id === requestId);
    if (request?.batch_details?.is_locked) {
      toast.warning('Please complete all pending payments before proceeding.');
      return;
    }

    try {
      await transportAPI.confirmArrivalRequest(requestId);
      toast.success('Arrival confirmed. The transporter can now mark the delivery as complete.');
      fetchData();
    } catch (error) {
      console.error('Error confirming arrival:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm arrival');
    }
  };

  // Filter incoming shipments - not yet delivered
  const incomingItems = transportRequests.filter(tr =>
    tr.status !== 'DELIVERED' && tr.status !== 'REJECTED'
  );

  const filteredItems = incomingItems.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const batchId = item.batch_details?.product_batch_id || '';
    const cropType = item.batch_details?.crop_type || '';
    return (
      batchId.toLowerCase().includes(searchLower) ||
      cropType.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status) => {
    const statusColors = {
      'PENDING': 'bg-gray-100 text-gray-700',
      'ACCEPTED': 'bg-blue-100 text-blue-700',
      'IN_TRANSIT_TO_RETAILER': 'bg-amber-100 text-amber-700',
      'ARRIVED_AT_RETAILER': 'bg-indigo-100 text-indigo-700',
      'ARRIVAL_CONFIRMED_BY_RETAILER': 'bg-purple-100 text-purple-700',
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
            <h1 className="text-2xl font-bold text-gray-900">Incoming Transport</h1>
            <p className="text-gray-600">Track shipments arriving at your store</p>
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
              placeholder="Search by batch ID or crop type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Incoming Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 hidden md:table-header-group">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Transport ID</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <Truck className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">
                          {searchTerm ? 'No shipments match your search' : 'No incoming shipments found'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors flex flex-col md:table-row border-b md:border-none p-4 md:p-0">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Transport ID:</span>
                        TR-{item.id}
                      </td>
                      <td className="px-6 py-4 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Batch:</span>
                        <div className="space-y-1 text-right md:text-left">
                          <span className="text-sm font-medium text-gray-900 block">
                            {item.batch_details?.product_batch_id || 'N/A'}
                          </span>
                          <span className="text-xs text-gray-500 block">
                            {item.batch_details?.crop_type || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Source:</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{item.from_party_details?.organization || item.from_party_details?.user_details?.username || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Transporter:</span>
                        {item.transporter_details ? (
                          <span>{item.transporter_details.user_details?.username || 'Assigned'}</span>
                        ) : (
                          <span className="text-gray-400 italic">Pending assignment</span>
                        )}
                      </td>
                      <td className="px-6 py-4 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Status:</span>
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 flex flex-col md:table-cell">
                        <div className="flex items-center gap-2 justify-end md:justify-start">
                          {(item.status === 'ARRIVED_AT_RETAILER' || item.status === 'ARRIVED') && (
                            <button
                              onClick={() => handleConfirmArrival(item.id)}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 flex items-center gap-1 w-full md:w-auto"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Confirm Arrival
                            </button>
                          )}
                          {item.status === 'PENDING' && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Waiting for transporter
                            </span>
                          )}
                          {(item.status === 'ACCEPTED' || item.status?.includes('IN_TRANSIT')) && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Navigation className="w-3 h-3" />
                              In Transit
                            </span>
                          )}
                          {(item.status === 'ARRIVAL_CONFIRMED' || item.status === 'ARRIVAL_CONFIRMED_BY_RETAILER') && (
                            <span className="text-xs text-purple-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Arrival Confirmed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default IncomingTransport;
