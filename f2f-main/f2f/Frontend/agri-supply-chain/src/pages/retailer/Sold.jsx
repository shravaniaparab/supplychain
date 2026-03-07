import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Loader2,
  Search,
  AlertCircle,
  Eye,
  TrendingUp,
  Calendar
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { retailAPI } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';

const Sold = () => {
  const { t } = useTranslation();
  const { formatCurrency, formatNumber } = useLocalizedNumber();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await retailAPI.list();
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setListings(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Filter sold listings
  const soldListings = listings.filter(l => l.is_for_sale === false);

  const filteredListings = soldListings.filter(listing => {
    const searchLower = searchTerm.toLowerCase();
    const batchId = listing.batch_details?.product_batch_id || '';
    const cropType = listing.batch_details?.crop_type || listing.crop_type || '';
    return (
      batchId.toLowerCase().includes(searchLower) ||
      cropType.toLowerCase().includes(searchLower)
    );
  });

  // Calculate total revenue
  const totalRevenue = soldListings.reduce((sum, listing) => sum + (listing.total_price || 0), 0);

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
            <h1 className="text-2xl font-bold text-gray-900">{t('retailer.soldProducts')}</h1>
            <p className="text-gray-600">{t('retailer.soldSubtitle')}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('retailer.totalRevenue')}</p>
                <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
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
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Sold Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 hidden md:table-header-group">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Batch ID</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Crop Type</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Price</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <div className="text-center py-12">
                        <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">{t('retailer.noSoldItems')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50 transition-colors flex flex-col md:table-row border-b md:border-none p-4 md:p-0">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Batch ID:</span>
                        {listing.batch_details?.product_batch_id || `LISTING-${listing.id}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Crop Type:</span>
                        {listing.batch_details?.crop_type || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Quantity:</span>
                        {listing.units_sold || 0} kg
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-emerald-600 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Sale Price:</span>
                        ₹{listing.total_price?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="px-6 py-4 flex justify-between md:table-cell">
                        <span className="md:hidden font-bold">Status:</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          SOLD
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-end md:table-cell">
                        <button
                          onClick={() => window.open(`/trace/${listing.batch_details?.public_batch_id}`, '_blank')}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center gap-1 w-full sm:w-auto"
                        >
                          <Eye className="w-4 h-4" />
                          View Trace
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Cards */}
        {filteredListings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{soldListings.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-3 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg. Sale Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{Math.round(totalRevenue / soldListings.length).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date().toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Sold;
