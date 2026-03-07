import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ScanLine,
  MapPin,
  CheckCircle,
  ArrowRight,
  Leaf,
  Loader2,
  AlertCircle,
  X,
  Bell,
  ChevronDown
} from 'lucide-react';
import { retailAPI } from '../../services/api';

// Product images mapping
const productImages = {
  tomato: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&h=300&fit=crop',
  'green beans': 'https://images.unsplash.com/photo-1567372781551-5e332f645c66?w=400&h=300&fit=crop',
  radish: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400&h=300&fit=crop',
  cucumber: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400&h=300&fit=crop',
  potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=300&fit=crop',
  onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&h=300&fit=crop',
  carrot: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=300&fit=crop',
  spinach: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop',
  cauliflower: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400&h=300&fit=crop',
  brinjal: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop',
  eggplant: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop',
  capsicum: 'https://images.unsplash.com/photo-1563565375-f3fdf5d2407c?w=400&h=300&fit=crop',
  pepper: 'https://images.unsplash.com/photo-1563565375-f3fdf5d2407c?w=400&h=300&fit=crop',
  chili: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400&h=300&fit=crop',
  chilli: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400&h=300&fit=crop',
  default: 'https://images.unsplash.com/photo-1610832958506-4b233f6f6c56?w=400&h=300&fit=crop'
};

const getProductImage = (cropType) => {
  if (!cropType) return productImages.default;
  const key = cropType.toLowerCase();
  return productImages[key] || productImages.default;
};

const getRetailerLocation = (listing) => {
  // Try to get location from various possible fields
  return listing.retailer_location || 
         listing.retailer_name || 
         listing.batch_details?.current_location ||
         listing.location ||
         'Local Market';
};

const ConsumerPortal = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [batchIdInput, setBatchIdInput] = useState('');

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await retailAPI.list();
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      // Filter only active listings for sale with remaining quantity
      const activeListings = data.filter(l => 
        l.is_for_sale === true && 
        l.batch_details?.status !== 'SOLD' &&
        (l.remaining_quantity === undefined || l.remaining_quantity > 0)
      );
      setListings(activeListings);
      setError(null);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load available produce. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (batchIdInput.trim()) {
      navigate(`/trace/${batchIdInput.trim()}`);
    }
  };

  const handleTraceClick = (publicBatchId) => {
    if (publicBatchId) {
      navigate(`/trace/${publicBatchId}`);
    }
  };

  const filteredListings = listings.filter(listing => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const cropType = listing.batch_details?.crop_type || '';
    const batchId = listing.batch_details?.product_batch_id || '';
    const location = getRetailerLocation(listing).toLowerCase();
    return (
      cropType.toLowerCase().includes(searchLower) ||
      batchId.toLowerCase().includes(searchLower) ||
      location.includes(searchLower)
    );
  });

  // Group listings by crop type for display
  const groupedListings = filteredListings.reduce((acc, listing) => {
    const cropType = listing.batch_details?.crop_type || 'Unknown';
    if (!acc[cropType]) {
      acc[cropType] = [];
    }
    acc[cropType].push(listing);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">AgriChain</span>
            </Link>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <form onSubmit={handleSearch} className="w-full relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={batchIdInput}
                  onChange={(e) => setBatchIdInput(e.target.value)}
                  placeholder="Enter Batch ID to trace..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowQRScanner(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <ScanLine className="w-4 h-4" />
                <span className="hidden sm:inline">Scan QR</span>
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl cursor-pointer">
                <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">GS</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-10 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Verified Agricultural Produce</h1>
              <p className="text-gray-500 mt-1">Scan QR or explore available verified batches.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Mobile Search */}
        <div className="md:hidden mb-6">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={batchIdInput}
              onChange={(e) => setBatchIdInput(e.target.value)}
              placeholder="Enter Batch ID to trace..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </form>
        </div>

        {/* Filter/Search for produce */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search produce, location, or batch ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
            <p className="text-gray-500">Loading verified produce...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchListings}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredListings.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No matching produce found' : 'No verified produce available'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {searchTerm 
                ? 'Try adjusting your search terms to find what you\'re looking for.' 
                : 'Check back soon as retailers add new verified batches to the platform.'}
            </p>
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && filteredListings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredListings.map((listing) => {
              const cropType = listing.batch_details?.crop_type || 'Unknown Product';
              const batchId = listing.batch_details?.product_batch_id || `BATCH-${listing.id}`;
              const publicBatchId = listing.batch_details?.public_batch_id;
              const price = listing.selling_price_per_unit || listing.total_price || 0;
              const location = getRetailerLocation(listing);
              const qrCodeUrl = listing.batch_details?.qr_code_image;
              const isPerishable = ['tomato', 'spinach', 'cauliflower', 'green beans', 'cucumber'].includes(cropType.toLowerCase());
              
              return (
                <div 
                  key={listing.id} 
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  {/* Image Container */}
                  <div className="relative h-40 overflow-hidden bg-gray-100">
                    <img
                      src={getProductImage(cropType)}
                      alt={cropType}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Verified Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-medium text-emerald-700 shadow-sm">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    </div>
                    {/* Perishable Badge (if applicable) */}
                    {isPerishable && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 rounded-full text-xs font-medium text-amber-700">
                          Perishable
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Title & Price */}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{cropType}</h3>
                    </div>
                    <p className="text-xl font-bold text-gray-900 mb-3">₹ {price} / kg</p>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-4">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{location}</span>
                    </div>

                    {/* QR Code & Batch ID */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs">
                        <p className="text-gray-400 uppercase tracking-wider font-medium">{batchId}</p>
                      </div>
                      {qrCodeUrl && (
                        <div className="bg-white p-1.5 rounded-lg border border-gray-200">
                          <img
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${qrCodeUrl}`}
                            alt="QR"
                            className="w-12 h-12"
                          />
                        </div>
                      )}
                    </div>

                    {/* View Trace Button */}
                    {publicBatchId && (
                      <button
                        onClick={() => handleTraceClick(publicBatchId)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                      >
                        <Search className="w-4 h-4" />
                        View Trace
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center">
                <Leaf className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">AgriChain</span>
            </div>
            <p className="text-sm text-gray-500">© 2026 AgriChain. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link to="/terms" className="hover:text-emerald-600">Terms</Link>
              <Link to="/privacy" className="hover:text-emerald-600">Privacy Policy</Link>
              <button className="flex items-center gap-1 hover:text-emerald-600">
                <span>EN</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Scan QR Code</h3>
              <button
                onClick={() => setShowQRScanner(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              Enter the Batch ID from the QR code to trace the product journey.
            </p>
            <form onSubmit={handleSearch} className="space-y-4">
              <input
                type="text"
                value={batchIdInput}
                onChange={(e) => setBatchIdInput(e.target.value)}
                placeholder="Enter Batch ID..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowQRScanner(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
                >
                  Trace Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumerPortal;
