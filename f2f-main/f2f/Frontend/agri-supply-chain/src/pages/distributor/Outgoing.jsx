import React, { useState, useEffect } from 'react';
import {
  Truck,
  Loader2,
  Search,
  AlertCircle,
  MapPin,
  Navigation,
  Clock
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { transportAPI } from '../../services/api';

const Outgoing = () => {
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
      setError('Failed to load outgoing shipments');
    } finally {
      setLoading(false);
    }
  };

  // Filter outgoing shipments - only those initiated by this distributor
  const outgoingItems = transportRequests.filter(tr =>
    tr.from_party_details?.role === 'distributor' &&
    !['DELIVERED', 'REJECTED'].includes(tr.status)
  );

  const filteredItems = outgoingItems.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const batchId = item.batch_details?.product_batch_id || '';
    const cropType = item.batch_details?.crop_type || '';
    const destOrg = item.to_party_details?.organization || '';
    return (
      batchId.toLowerCase().includes(searchLower) ||
      cropType.toLowerCase().includes(searchLower) ||
      destOrg.toLowerCase().includes(searchLower)
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
            <h1 className="text-2xl font-bold text-gray-900">Outgoing Shipments</h1>
            <p className="text-gray-600">Track shipments to retailers</p>
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
              placeholder="Search by batch ID, crop type, or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Outgoing Shipments — Hybrid Layout */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-cosmos-800 rounded-2xl border border-dashed border-gray-200 dark:border-cosmos-700 p-12 text-center">
              <Truck className="w-12 h-12 text-gray-300 dark:text-cosmos-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-cosmos-400 font-medium font-bold">
                {searchTerm ? 'No shipments match your search' : 'No outgoing shipments found'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block bg-white dark:bg-cosmos-800 rounded-2xl border border-emerald-100 dark:border-cosmos-700 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-emerald-50 dark:bg-cosmos-900 border-b border-emerald-100 dark:border-cosmos-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">Request ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">Batch Info</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">Destination</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">Transporter</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-cosmos-400 uppercase tracking-wider">Tracking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 dark:divide-cosmos-700">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-50/30 dark:hover:bg-cosmos-900/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-cosmos-400">
                          TR-{item.id}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {item.batch_details?.product_batch_id || 'N/A'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-cosmos-400 capitalize">
                              {item.batch_details?.crop_type || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-cosmos-300">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{item.to_party_details?.organization || item.to_party_details?.user_details?.username || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-cosmos-300">
                          {item.transporter_details ? (
                            <span className="flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-blue-500" />
                              {item.transporter_details.user_details?.username || 'Assigned'}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Pending assignment</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === 'PENDING' && (
                              <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                Wait
                              </span>
                            )}
                            {(item.status === 'ACCEPTED' || item.status.includes('IN_TRANSIT')) && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-bold">
                                <Navigation className="w-3.5 h-3.5" />
                                Transit
                              </span>
                            )}
                            {(item.status === 'ARRIVED_AT_RETAILER' || item.status === 'ARRIVAL_CONFIRMED_BY_RETAILER') && (
                              <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-bold">
                                <MapPin className="w-3.5 h-3.5" />
                                Arrived
                              </span>
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
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-cosmos-800 rounded-2xl border border-emerald-100 dark:border-cosmos-700 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-[10px] text-gray-400 dark:text-cosmos-400 bg-gray-50 dark:bg-cosmos-900 px-2 py-0.5 rounded">
                        #{item.batch_details?.product_batch_id || 'N/A'}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                        {item.batch_details?.crop_type || 'Unknown'}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-cosmos-400 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>To: {item.to_party_details?.organization || 'Retailer'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-cosmos-700">
                      <div className="flex items-center gap-2">
                        {item.transporter_details ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <Truck className="w-3 h-3 text-blue-600" />
                            </div>
                            <span className="text-xs font-bold text-gray-700 dark:text-cosmos-300">
                              {item.transporter_details.user_details?.username}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Waiting for transporter...</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs">
                        {item.status.includes('IN_TRANSIT') ? (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest text-[10px]">
                            <Navigation className="w-3 h-3" />
                            In Transit
                          </span>
                        ) : (
                          <span className="text-gray-400">TR-{item.id}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Outgoing;
