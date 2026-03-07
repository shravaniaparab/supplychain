import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Sprout,
  ScanLine,
  Search,
  ArrowLeft,
  Truck,
  CheckCircle,
  AlertCircle,
  MapPin,
  User,
  ArrowRight,
  Warehouse,
  Store,
  Building,
  CalendarDays,
  Activity,
  Shield
} from 'lucide-react';
import { consumerAPI, inspectionAPI } from '../../services/api';
import { InspectionTimeline } from '../../components/inspection';
import PublicTopNav from '../../components/layout/PublicTopNav';

const ConsumerTrace = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const [batchIdTerm, setBatchIdTerm] = useState(publicId || '');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loadingInspections, setLoadingInspections] = useState(false);

  useEffect(() => {
    if (publicId) {
      performTrace(publicId);
    }
  }, [publicId]);

  const performTrace = async (id) => {
    setLoading(true);
    setError(null);
    setInspections([]);
    try {
      const response = await consumerAPI.traceBatch(id);
      setSearchResult(response.data);
      if (response.data?.batch_id) {
        fetchInspections(response.data.batch_id);
      }
    } catch (err) {
      console.error('Error tracing batch:', err);
      setError(err.response?.data?.message || 'Batch not found. Please verify the ID.');
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchInspections = async (batchId) => {
    try {
      setLoadingInspections(true);
      const response = await inspectionAPI.getBatchTimeline(batchId);
      setInspections(response.data);
    } catch (err) {
      console.log('No inspections available for this batch');
      setInspections([]);
    } finally {
      setLoadingInspections(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!batchIdTerm.trim()) return;
    performTrace(batchIdTerm.trim());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <PublicTopNav />
        <div className="text-center space-y-4 pt-20">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Fetching Traceability Data...</p>
        </div>
      </div>
    );
  }

  if (!searchResult || error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <PublicTopNav />
        <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{error ? 'Trace Failed' : 'Batch Not Found'}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">{error || 'Please verify the Batch ID and try again.'}</p>

          <form onSubmit={handleSearch} className="space-y-4">
            <input
              type="text"
              value={batchIdTerm}
              onChange={(e) => setBatchIdTerm(e.target.value)}
              placeholder="Enter Batch ID"
              className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500 transition-all outline-none dark:text-white"
            />
            <button className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              <span>Retry Search</span>
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="mt-6 text-sm text-slate-400 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2 mx-auto font-bold uppercase tracking-widest px-4 py-2 border border-slate-100 dark:border-slate-800 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 overflow-y-auto scroll-smooth">
      <PublicTopNav />
      <div className="h-20" /> {/* Spacer */}

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 pb-24">
        {/* A. PRODUCT SUMMARY CARD */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="grid md:grid-cols-5">
            <div className="p-10 md:col-span-3 space-y-6">
              <span className="inline-block px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-200 dark:border-emerald-800/50">
                Verified Product Info
              </span>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white capitalize tracking-tighter">{searchResult.product_name}</h1>
                <p className="text-slate-400 font-mono text-xs mt-2">BATCH ID: {searchResult.batch_id}</p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantity</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{searchResult.quantity || '0'} kg</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Retail Price</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">₹{Number(searchResult.retail_price || 0).toFixed(2)} <span className="text-sm font-bold text-slate-400">/ kg</span></p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className={`text-sm font-black px-4 py-1.5 rounded-full border uppercase tracking-widest ${
                  searchResult.status === 'SOLD' 
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50'
                    : searchResult.status === 'IN_TRANSIT'
                    ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50'
                    : searchResult.status === 'SUSPENDED'
                    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50'
                    : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50'
                }`}>
                  {searchResult.status}
                </span>
              </div>
            </div>

            <div className="p-10 md:col-span-2 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center border-l border-slate-100 dark:border-slate-800 text-center">
              <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100 group hover:rotate-2 transition-transform duration-500">
                {searchResult.qr_code_url ? (
                  <img
                    src={searchResult.qr_code_url.startsWith('data:') ? searchResult.qr_code_url : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${searchResult.qr_code_url}`}
                    alt="QR Code"
                    className="w-32 h-32"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-slate-300">
                    <ScanLine className="w-12 h-12" />
                  </div>
                )}
              </div>
              <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Blockchain QR Proof</p>
            </div>
          </div>
        </section>

        {/* B. PRICE JOURNEY */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 p-10">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tight flex items-center gap-3">
            Price Journey
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
            <span className="text-slate-400 font-bold text-sm uppercase tracking-widest">Soil to Soul</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Farmer Base</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">₹{Number(searchResult.price_breakdown?.farmer_price || 0).toFixed(2)}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/50 relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 hidden lg:block">
                <ArrowRight className="w-5 h-5 text-emerald-300" />
              </div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Transport</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">₹{Number(searchResult.price_breakdown?.transport_cost || 0).toFixed(2)}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/50 relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 hidden lg:block">
                <ArrowRight className="w-5 h-5 text-emerald-300" />
              </div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Distributor</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">₹{Number(searchResult.price_breakdown?.distributor_margin || 0).toFixed(2)}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/50 relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 hidden lg:block">
                <ArrowRight className="w-5 h-5 text-emerald-300" />
              </div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Retailer</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">₹{Number(searchResult.price_breakdown?.retailer_margin || 0).toFixed(2)}</p>
            </div>
          </div>
        </section>

        {/* C. STAKEHOLDER JOURNEY - Always show all cards */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 p-10">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Origin & Stakeholders</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Farmer Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Farmer</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{searchResult.origin?.farmer_name || 'N/A'}</div>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Farm Location</span>
                  <span className="text-slate-900 dark:text-white font-medium truncate ml-2 max-w-[100px]">{searchResult.origin?.farm_location || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Harvest Date</span>
                  <span className="text-slate-900 dark:text-white font-medium">{searchResult.origin?.harvest_date ? new Date(searchResult.origin.harvest_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                </div>
                {searchResult.inspections?.farmer?.status === 'PASSED' && (
                  <div className="flex items-center gap-1 text-emerald-600 font-bold mt-2">
                    <CheckCircle className="w-3 h-3" />
                    <span>Passed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Transporter Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Transporter</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{searchResult.transporter?.name || searchResult.transporter?.company_name || 'N/A'}</div>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pickup Date</span>
                  <span className="text-slate-900 dark:text-white font-medium">{searchResult.transporter?.pickup_date ? new Date(searchResult.transporter.pickup_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Date</span>
                  <span className="text-slate-900 dark:text-white font-medium">{searchResult.transporter?.delivery_date ? new Date(searchResult.transporter.delivery_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Distributor Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-600 uppercase tracking-wider">Distributor</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{searchResult.distributor?.name || searchResult.distributor?.company_name || 'N/A'}</div>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Distribution Center</span>
                  <span className="text-slate-900 dark:text-white font-medium truncate ml-2 max-w-[100px]">{searchResult.distributor?.location || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Arrival Date</span>
                  <span className="text-slate-900 dark:text-white font-medium">{searchResult.distributor?.arrival_date ? new Date(searchResult.distributor.arrival_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                </div>
                {searchResult.inspections?.distributor?.status === 'PASSED' && (
                  <div className="flex items-center gap-1 text-emerald-600 font-bold mt-2">
                    <CheckCircle className="w-3 h-3" />
                    <span>Passed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Retailer Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Retailer</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{searchResult.retailer?.name || searchResult.retailer?.shop_name || 'N/A'}</div>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Retailer Name</span>
                  <span className="text-slate-900 dark:text-white font-medium truncate ml-2 max-w-[100px]">{searchResult.retailer?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Listed Date</span>
                  <span className="text-slate-900 dark:text-white font-medium">{searchResult.retailer?.listed_date ? new Date(searchResult.retailer.listed_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                </div>
                {searchResult.inspections?.retailer?.status === 'PASSED' && (
                  <div className="flex items-center gap-1 text-emerald-600 font-bold mt-2">
                    <CheckCircle className="w-3 h-3" />
                    <span>Passed</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* D. BATCH STATUS TIMELINE - Updated Layout */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 p-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Supply Chain Journey</h2>
            <span className="text-sm text-slate-500 font-medium">{searchResult.timeline?.length || searchResult.status_history?.length || 0} events recorded</span>
          </div>

          {/* Horizontal Journey Steps */}
          <div className="relative mb-12">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              {/* Farm Step */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <Sprout className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Farm</p>
                  <p className="text-xs text-slate-500">Origin</p>
                </div>
              </div>

              {/* Connector */}
              <div className="flex-1 h-1 bg-emerald-200 dark:bg-emerald-800 mx-4"></div>

              {/* Transport Step */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Truck className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Transport</p>
                  <p className="text-xs text-slate-500">In Transit</p>
                </div>
              </div>

              {/* Connector */}
              <div className="flex-1 h-1 bg-emerald-200 dark:bg-emerald-800 mx-4"></div>

              {/* Distributor Step */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Building className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Distributor</p>
                  <p className="text-xs text-slate-500">Storage</p>
                </div>
              </div>

              {/* Connector */}
              <div className="flex-1 h-1 bg-emerald-200 dark:bg-emerald-800 mx-4"></div>

              {/* Retailer Step */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <Store className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Retailer</p>
                  <p className="text-xs text-slate-500">Point of Sale</p>
                </div>
              </div>
            </div>
          </div>

          {/* Event History */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Event History</h3>
            {searchResult.timeline && searchResult.timeline.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {searchResult.timeline.map((event, index) => {
                  // Determine colors based on event stage/type
                  const getEventColors = (stage) => {
                    const stageLower = stage?.toLowerCase() || '';
                    if (stageLower.includes('created') || stageLower.includes('harvest') || stageLower.includes('farmer')) {
                      return {
                        bg: 'bg-emerald-50 dark:bg-emerald-900/10',
                        border: 'border-emerald-100 dark:border-emerald-800/30',
                        iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
                        text: 'text-emerald-700 dark:text-emerald-300'
                      };
                    } else if (stageLower.includes('transport') || stageLower.includes('transit') || stageLower.includes('pickup') || stageLower.includes('delivery')) {
                      return {
                        bg: 'bg-blue-50 dark:bg-blue-900/10',
                        border: 'border-blue-100 dark:border-blue-800/30',
                        iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                        text: 'text-blue-700 dark:text-blue-300'
                      };
                    } else if (stageLower.includes('distributor') || stageLower.includes('storage') || stageLower.includes('arrival')) {
                      return {
                        bg: 'bg-purple-50 dark:bg-purple-900/10',
                        border: 'border-purple-100 dark:border-purple-800/30',
                        iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
                        text: 'text-purple-700 dark:text-purple-300'
                      };
                    } else if (stageLower.includes('retail') || stageLower.includes('listed') || stageLower.includes('sale') || stageLower.includes('sold')) {
                      return {
                        bg: 'bg-amber-50 dark:bg-amber-900/10',
                        border: 'border-amber-100 dark:border-amber-800/30',
                        iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                        text: 'text-amber-700 dark:text-amber-300'
                      };
                    } else if (stageLower.includes('inspection') || stageLower.includes('quality')) {
                      return {
                        bg: 'bg-teal-50 dark:bg-teal-900/10',
                        border: 'border-teal-100 dark:border-teal-800/30',
                        iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
                        text: 'text-teal-700 dark:text-teal-300'
                      };
                    } else {
                      return {
                        bg: 'bg-slate-50 dark:bg-slate-800/30',
                        border: 'border-slate-100 dark:border-slate-700',
                        iconBg: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                        text: 'text-slate-700 dark:text-slate-300'
                      };
                    }
                  };
                  
                  const colors = getEventColors(event.stage);
                  
                  return (
                    <div key={index} className={`flex items-start gap-4 p-4 rounded-2xl border ${colors.bg} ${colors.border}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colors.iconBg}`}>
                        {event.status === 'COMPLETED' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : event.status === 'IN_PROGRESS' ? (
                          <Activity className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-bold text-sm ${colors.text}`}>{event.stage}</h4>
                          {event.date && (
                            <span className="text-xs text-slate-400 shrink-0">{new Date(event.date).toLocaleDateString('en-IN')}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{event.description}</p>
                        {event.by && (
                          <p className="text-xs text-slate-400 mt-1">By: {event.by}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchResult.status_history && searchResult.status_history.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {searchResult.status_history.map((status, index) => {
                  // Determine colors based on status
                  const getStatusColors = (statusText) => {
                    const statusLower = statusText?.toLowerCase() || '';
                    if (statusLower.includes('created') || statusLower.includes('harvest')) {
                      return {
                        bg: 'bg-emerald-50 dark:bg-emerald-900/10',
                        border: 'border-emerald-100 dark:border-emerald-800/30',
                        iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
                        text: 'text-emerald-700 dark:text-emerald-300'
                      };
                    } else if (statusLower.includes('transport') || statusLower.includes('transit')) {
                      return {
                        bg: 'bg-blue-50 dark:bg-blue-900/10',
                        border: 'border-blue-100 dark:border-blue-800/30',
                        iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                        text: 'text-blue-700 dark:text-blue-300'
                      };
                    } else if (statusLower.includes('distributor') || statusLower.includes('storage')) {
                      return {
                        bg: 'bg-purple-50 dark:bg-purple-900/10',
                        border: 'border-purple-100 dark:border-purple-800/30',
                        iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
                        text: 'text-purple-700 dark:text-purple-300'
                      };
                    } else if (statusLower.includes('retail') || statusLower.includes('listed') || statusLower.includes('sold')) {
                      return {
                        bg: 'bg-amber-50 dark:bg-amber-900/10',
                        border: 'border-amber-100 dark:border-amber-800/30',
                        iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                        text: 'text-amber-700 dark:text-amber-300'
                      };
                    } else {
                      return {
                        bg: 'bg-emerald-50 dark:bg-emerald-900/10',
                        border: 'border-emerald-100 dark:border-emerald-800/30',
                        iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
                        text: 'text-emerald-700 dark:text-emerald-300'
                      };
                    }
                  };
                  
                  const colors = getStatusColors(status.status);
                  
                  return (
                    <div key={index} className={`flex items-start gap-4 p-4 rounded-2xl border ${colors.bg} ${colors.border}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colors.iconBg}`}>
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-bold text-sm ${colors.text}`}>{status.status?.replace(/_/g, ' ')}</h4>
                          {status.date && (
                            <span className="text-xs text-slate-400 shrink-0">{new Date(status.date).toLocaleDateString('en-IN')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                <Activity className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold tracking-tight">No status timeline available.</p>
              </div>
            )}
          </div>
        </section>

        {/* E. INSPECTIONS */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 p-10">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Quality Inspections</h2>
          {inspections && inspections.length > 0 ? (
            <InspectionTimeline
              batchId={searchResult.batch_id}
              inspections={inspections}
            />
          ) : (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
              <Activity className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold tracking-tight">No detailed inspections recorded yet.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ConsumerTrace;
