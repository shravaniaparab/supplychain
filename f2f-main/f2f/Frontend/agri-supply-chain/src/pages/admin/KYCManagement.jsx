import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  FileCheck,
  Eye,
  X
} from 'lucide-react';
import { adminAPI } from '../../services/adminApi';
import { useToast } from '../../context/ToastContext';

const KYCManagement = () => {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const [kycRecords, setKycRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [notes, setNotes] = useState('');
  const [viewingDocument, setViewingDocument] = useState(null);

  // Role to document type mapping
  const getRoleDocumentType = (role) => {
    const documentTypes = {
      farmer: 'Land Document',
      distributor: 'Trade License',
      transporter: 'Transport License',
      retailer: 'Shop License',
      consumer: 'Identity Document'
    };
    return documentTypes[role?.toLowerCase()] || 'Registration Document';
  };

  useEffect(() => {
    fetchKYCRecords();
  }, [filter]);

  const fetchKYCRecords = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllKYC(filter === 'all' ? '' : filter);
      setKycRecords(response.data);
    } catch (error) {
      console.error('Error fetching KYC records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id, decision) => {
    console.log('handleDecision called with:', { id, decision, notes });
    try {
      const response = await adminAPI.decideKYC(id, decision, notes);
      console.log('KYC decision response:', response);
      setSelectedRecord(null);
      setNotes('');
      fetchKYCRecords();
      // Refresh user data to update KYC status across the app
      await refreshUser();
    } catch (error) {
      console.error('Error updating KYC:', error);
      toast.error('Error updating KYC: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const normalizedStatus = status?.toLowerCase() || 'pending';
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[normalizedStatus] || styles.pending}`}>
        {status || 'Pending'}
      </span>
    );
  };

  const filteredRecords = kycRecords.filter(record => {
    const searchLower = searchTerm.toLowerCase();
    const user = record.profile_details?.user_details;
    const role = record.profile_details?.role;
    return (
      user?.username?.toLowerCase().includes(searchLower) ||
      user?.email?.toLowerCase().includes(searchLower) ||
      role?.toLowerCase().includes(searchLower)
    );
  });


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Management</h1>
          <p className="text-gray-600">Review and approve user KYC submissions</p>
        </div>
        <button
          onClick={fetchKYCRecords}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by username, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <p className="text-sm text-amber-700 mb-1">Pending</p>
          <p className="text-xl md:text-2xl font-bold text-amber-800">
            {kycRecords.filter(r => r.status?.toLowerCase() === 'pending').length}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-700 mb-1">Approved</p>
          <p className="text-xl md:text-2xl font-bold text-green-800">
            {kycRecords.filter(r => r.status?.toLowerCase() === 'approved').length}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm text-red-700 mb-1">Rejected</p>
          <p className="text-xl md:text-2xl font-bold text-red-800">
            {kycRecords.filter(r => r.status?.toLowerCase() === 'rejected').length}
          </p>
        </div>
      </div>

      {/* KYC Records — Card Layout (no tables, no horizontal scroll) */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-cosmos-800 rounded-2xl border border-emerald-100 dark:border-cosmos-700">
            <FileCheck className="w-12 h-12 text-gray-300 dark:text-cosmos-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-cosmos-400 font-medium">No KYC records found</p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="bg-white dark:bg-cosmos-800 rounded-2xl border border-emerald-100 dark:border-cosmos-700 shadow-sm p-4">
              {/* Row 1: Avatar + Name + Role + Date */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-cosmos-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-emerald-700 dark:text-cosmos-300">
                    {(record.profile_details?.user_details?.username || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {record.profile_details?.user_details?.username || 'N/A'}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-emerald-100 dark:bg-cosmos-700 text-emerald-700 dark:text-cosmos-300`}>
                      {record.profile_details?.role || 'N/A'}
                    </span>
                    {getStatusBadge(record.status)}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-cosmos-400 truncate">
                    {record.profile_details?.user_details?.email || 'N/A'}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400 dark:text-cosmos-400">
                    <span>Submitted: {record.created_at ? new Date(record.created_at).toLocaleDateString('en-IN') : 'N/A'}</span>
                    <span>Doc: {record.document_type || getRoleDocumentType(record.profile_details?.role)}</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Document + Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-emerald-50 dark:border-cosmos-700">
                <div>
                  {record.document_file ? (
                    <button
                      onClick={() => setViewingDocument({
                        url: record.document_file,
                        type: record.document_type || getRoleDocumentType(record.profile_details?.role),
                        user: record.profile_details?.user_details?.username
                      })}
                      className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 text-xs font-medium"
                    >
                      <Eye className="w-3 h-3" />
                      View Document
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-cosmos-400">No document uploaded</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {(record.status === 'PENDING' || record.status === 'pending') ? (
                    <>
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => setSelectedRecord({ ...record, rejectMode: true })}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg hover:bg-red-100 font-medium border border-red-200 dark:border-red-800 flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-cosmos-400 italic">
                      {record.verified_by ? `Reviewed by ${record.verified_by.user?.username}` : 'Processed'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Decision Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedRecord.rejectMode ? 'Reject KYC' : 'Approve KYC'}
            </h3>
            <p className="text-gray-600 mb-4">
              User: <span className="font-medium">{selectedRecord.profile_details?.user_details?.username}</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this decision..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows="3"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedRecord(null);
                  setNotes('');
                }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision(
                  selectedRecord.id,
                  selectedRecord.rejectMode ? 'rejected' : 'approved'
                )}
                className={`flex-1 px-4 py-2 text-white rounded-lg ${selectedRecord.rejectMode
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {selectedRecord.rejectMode ? 'Reject' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {viewingDocument.type}
                </h3>
                <p className="text-sm text-gray-500">
                  Uploaded by: {viewingDocument.user}
                </p>
              </div>
              <button
                onClick={() => setViewingDocument(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center min-h-[400px]">
              {viewingDocument.url?.match(/data:image\/(jpeg|jpg|png|gif|webp)/i) || viewingDocument.url?.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ? (
                <img
                  src={viewingDocument.url}
                  alt={viewingDocument.type}
                  className="w-full max-h-[70vh] object-contain"
                />
              ) : viewingDocument.url?.match(/data:application\/pdf/i) || viewingDocument.url?.match(/\.pdf(\?|$)/i) ? (
                <embed
                  src={viewingDocument.url}
                  type="application/pdf"
                  className="w-full h-[70vh]"
                />
              ) : viewingDocument.url?.startsWith('data:') ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileCheck className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Document Verified</h4>
                  <p className="text-gray-600 max-w-sm mx-auto">
                    The {viewingDocument.type} for <strong>{viewingDocument.user}</strong> has been uploaded and is ready for review.
                  </p>
                  <p className="mt-4 text-xs text-gray-400">Document stored securely. Preview not available for this format.</p>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileCheck className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Document Verified</h4>
                  <p className="text-gray-600 max-w-sm mx-auto">
                    The {viewingDocument.type} for <strong>{viewingDocument.user}</strong> has been uploaded and is ready for review.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCManagement;
