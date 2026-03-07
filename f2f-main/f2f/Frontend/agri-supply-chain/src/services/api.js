import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect if we're already on the login page or if it's a login request
    const isLoginPage = window.location.pathname === '/login';
    const isLoginRequest = error.config?.url?.includes('/auth/login/');

    if (error.response?.status === 401 && !isLoginPage && !isLoginRequest) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    // Handle 402 Payment Required for locked batches
    if (error.response?.status === 402) {
      const event = new CustomEvent('payment-required', {
        detail: error.response.data
      });
      window.dispatchEvent(event);
    }

    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  register: (data) => {
    // Check if data is FormData (has file upload)
    const isFormData = data instanceof FormData;
    return api.post('/auth/register/', data, {
      headers: isFormData ? {
        'Content-Type': 'multipart/form-data',
      } : {
        'Content-Type': 'application/json',
      }
    });
  },
  me: () => api.get('/auth/me/'),
  updateProfile: (data) => api.patch('/auth/me/', data),
};

// Stakeholder APIs
export const stakeholderAPI = {
  getProfile: (id) => api.get(`/stakeholders/${id}/`),
  updateProfile: (id, data) => api.patch(`/stakeholders/${id}/`, data),
  listProfiles: (params) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get(`/stakeholders/${queryString}`);
  },
};

// KYC APIs
export const kycAPI = {
  list: () => api.get('/kyc-records/'),
  submit: (data) => api.post('/kyc-records/', data),
  updateStatus: (id, data) => api.patch(`/kyc-records/${id}/`, data),
};

// Crop Batch APIs
export const batchAPI = {
  list: () => api.get('/crop-batches/'),
  create: (data) => api.post('/crop-batches/', data),
  get: (id) => api.get(`/crop-batches/${id}/`),
  update: (id, data) => api.patch(`/crop-batches/${id}/`, data),
  suspend: (id, reason) => api.post(`/batch/${id}/suspend/`, { reason }),
  bulkSplit: (id, data) => api.post(`/batch/${id}/bulk-split/`, data),
};

// Transport APIs
export const transportAPI = {
  list: () => api.get('/transport-requests/'),
  create: (data) => api.post('/transport-requests/', data),
  get: (id) => api.get(`/transport-requests/${id}/`),
  update: (id, data) => api.patch(`/transport-requests/${id}/`, data),
  // New transport workflow endpoints
  createRequest: (data) => api.post('/transport/request/', data),
  acceptRequest: (id, data) => api.post(`/transport/${id}/accept/`, data),
  arriveRequest: (id) => api.post(`/transport/${id}/arrive/`),
  confirmArrivalRequest: (id) => api.post(`/transport/${id}/confirm-arrival/`),
  deliverRequest: (id) => api.post(`/transport/${id}/deliver/`),
  rejectRequest: (id) => api.post(`/transport/${id}/reject/`),
};

// Inspection APIs
export const inspectionAPI = {
  list: () => api.get('/inspection-reports/'),
  create: (data) => api.post('/inspection-reports/', data),
  get: (id) => api.get(`/inspection-reports/${id}/`),
  getBatchTimeline: (batchId) => api.get(`/inspection-reports/batch/${batchId}/`),
};

// Retail APIs
export const retailAPI = {
  list: () => api.get('/retail-listings/'),
  create: (data) => api.post('/retail-listings/', data),
  get: (id) => api.get(`/retail-listings/${id}/`),
  update: (id, data) => api.patch(`/retail-listings/${id}/`, data),
};

// Batch Split APIs
export const batchSplitAPI = {
  list: () => api.get('/batch-splits/'),
  create: (data) => api.post('/batch-splits/', data),
  get: (id) => api.get(`/batch-splits/${id}/`),
};

// Consumer APIs
export const consumerAPI = {
  scan: (data) => api.post('/consumer-scans/', data),
  traceBatch: (publicId) => api.get(`/public/trace/${publicId}/`),
};

// Distributor APIs
export const distributorAPI = {
  storeBatch: (batchId, data) => api.post(`/distributor/batch/${batchId}/store/`, data),
  requestTransportToRetailer: (data) => api.post('/distributor/transport/request-to-retailer/', data),
};

// Retailer APIs
export const retailerAPI = {
  markSold: (batchId, soldQuantity) => api.post(`/retailer/batch/${batchId}/mark-sold/`, { sold_quantity: soldQuantity }),
};

// Dashboard APIs
export const dashboardAPI = {
  getFarmerDashboard: () => api.get('/dashboard/farmer/'),
  getTransporterAnalytics: () => api.get('/dashboard/transporter/'),
  getDistributorAnalytics: () => api.get('/dashboard/distributor/'),
  getRetailerAnalytics: () => api.get('/dashboard/retailer/'),
};

export default api;
