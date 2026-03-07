import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react';
import { adminAPI } from '../../services/adminApi';
import { useTranslation } from 'react-i18next';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    pendingKYC: 0,
    totalUsers: 0,
    approvedKYC: 0,
    rejectedKYC: 0,
    usersByRole: {},
  });
  const [kycRecords, setKycRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const statsResponse = await adminAPI.getDashboardStats();
      const data = statsResponse.data;

      setStats({
        pendingKYC: data.pending_kyc || 0,
        totalUsers: data.total_users || 0,
        approvedKYC: data.approved_kyc || 0,
        rejectedKYC: data.rejected_kyc || 0,
        usersByRole: data.users_by_role || {},
      });

      const kycResponse = await adminAPI.getPendingKYC();
      setKycRecords(kycResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleKYCAction = async (id, decision) => {
    try {
      await adminAPI.decideKYC(id, decision.toLowerCase());
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating KYC:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      PENDING: 'bg-amber-100 text-amber-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
    };
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
    };
    const normalizedStatus = status?.toLowerCase() || 'pending';
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[normalizedStatus] || styles[status]}`}>
        {labels[normalizedStatus] || labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.adminTitle')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('dashboard.adminSubtitle')}</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          {t('buttons.refreshData')}
        </button>
      </div>

      {/* Stats Cards — user details only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-cosmos-800 rounded-xl shadow-sm p-6 border border-emerald-100 dark:border-cosmos-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-cosmos-400 mb-1 font-medium">{t('dashboard.kycPending')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingKYC}</p>
            </div>
            <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-cosmos-800 rounded-xl shadow-sm p-6 border border-emerald-100 dark:border-cosmos-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-cosmos-400 mb-1 font-medium">{t('dashboard.totalUsers')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-cosmos-800 rounded-xl shadow-sm p-6 border border-emerald-100 dark:border-cosmos-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-cosmos-400 mb-1 font-medium">{t('dashboard.approvedKYC')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.approvedKYC}</p>
            </div>
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Users by Role */}
      {stats.usersByRole && Object.keys(stats.usersByRole).length > 0 && (
        <div className="bg-white dark:bg-cosmos-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-cosmos-700 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-emerald-100 dark:border-cosmos-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('users.title')}</h2>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(stats.usersByRole).map(([role, count]) => (
              <div key={role} className="bg-emerald-50 dark:bg-cosmos-900 rounded-xl p-4 text-center border border-emerald-100 dark:border-cosmos-700">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{count}</p>
                <p className="text-xs text-gray-500 dark:text-cosmos-400 capitalize mt-1">{t(`roles.${role.toUpperCase()}`, role)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KYC Requests — Card Layout */}
      <div className="bg-white dark:bg-cosmos-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-cosmos-700 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-emerald-100 dark:border-cosmos-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dashboard.recentKYC')}</h2>
          <Link to="/admin/kyc" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
            {t('buttons.viewAll')}
          </Link>
        </div>
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : kycRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-cosmos-400">{t('dashboard.noKYC')}</div>
          ) : (
            kycRecords.slice(0, 5).map((record) => (
              <div key={record.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-cosmos-900 border border-emerald-100 dark:border-cosmos-700">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-cosmos-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-emerald-700 dark:text-cosmos-300">
                    {(record.profile_details?.user_details?.username || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {record.profile_details?.user_details?.username || 'N/A'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 dark:text-cosmos-400 capitalize">{record.profile_details?.role || 'N/A'}</span>
                    <span className="text-gray-300 dark:text-cosmos-600">·</span>
                    <span className="text-xs text-gray-400 dark:text-cosmos-400">
                      {record.created_at ? new Date(record.created_at).toLocaleDateString('en-IN') : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getStatusBadge(record.status)}
                  {(record.status === 'PENDING' || record.status === 'pending') && (
                    <>
                      <button onClick={() => handleKYCAction(record.id, 'APPROVED')}
                        className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors" title="Approve">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleKYCAction(record.id, 'REJECTED')}
                        className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 transition-colors" title="Reject">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
