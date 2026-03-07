import api from './api';

export const adminAPI = {
  // Dashboard stats
  getDashboardStats: () => api.get('/admin/stats/'),

  // KYC Management
  getPendingKYC: () => api.get('/admin/kyc/pending/'),
  getAllKYC: (status) => api.get('/admin/kyc/all/', { params: { status } }),
  decideKYC: (id, decision, notes = '') => api.post(`/admin/kyc/decide/${id}/`, { decision, notes }),

  // User Management
  getAllUsers: (role) => api.get('/admin/users/', { params: { role } }),
  getUserDetail: (id) => api.get(`/admin/users/${id}/`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}/`, data),
};

export default adminAPI;
