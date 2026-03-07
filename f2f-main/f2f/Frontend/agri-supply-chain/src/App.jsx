import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import AdminLayout from './components/admin/AdminLayout';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import RoleSelection from './pages/public/RoleSelection';
import LoginPage from './pages/public/LoginPage';
import ConsumerTrace from './pages/public/ConsumerTrace';
import ConsumerPortal from './pages/public/ConsumerPortal';

// Auth Pages
import RegistrationPage from './pages/auth/RegistrationPage';
import KYCPendingPage from './pages/auth/KYCPendingPage';
import KYCRejectedPage from './pages/auth/KYCRejectedPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import KYCManagement from './pages/admin/KYCManagement';
import UserManagement from './pages/admin/UserManagement';
// Role Dashboards
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import FarmerBatches from './pages/farmer/FarmerBatches';
import DistributorDashboard from './pages/distributor/DistributorDashboard';
import Incoming from './pages/distributor/Incoming';
import Inventory from './pages/distributor/Inventory';
import Outgoing from './pages/distributor/Outgoing';
import TransporterDashboard from './pages/transporter/TransporterDashboard';
import FarmerShipments from './pages/transporter/FarmerShipments';
import DistributorShipments from './pages/transporter/DistributorShipments';
import InTransit from './pages/transporter/InTransit';
import Completed from './pages/transporter/Completed';
import RetailerDashboard from './pages/retailer/RetailerDashboard';
import IncomingTransport from './pages/retailer/IncomingTransport';
import Received from './pages/retailer/Received';
import Listed from './pages/retailer/Listed';
import Sold from './pages/retailer/Sold';
import NewListingPage from './pages/retailer/NewListingPage';
import ConsumerDashboard from './pages/consumer/ConsumerDashboard';
import ProfilePage from './pages/ProfilePage';
import PaymentsPage from './pages/payment/PaymentsPage';
// Shared Pages

// Admin Protected Route
const AdminProtectedRoute = ({ children }) => {
  const { user, role, kycStatus } = useAuth();
  const isAuthenticated = !!user;

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (role?.toLowerCase() !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  if (kycStatus === 'PENDING') {
    return <Navigate to="/admin/login" replace />;
  }

  if (kycStatus === 'REJECTED') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const isAuthenticated = !!user;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">
        Loading session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(role?.toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Route (don't redirect if authenticated)
const PublicRoute = ({ children }) => {
  return children;
};

import PaymentLockedModal from './components/payment/PaymentLockedModal';

function App() {
  const [isPaymentLockedModalOpen, setIsPaymentLockedModalOpen] = React.useState(false);
  const [lockedBatchData, setLockedBatchData] = React.useState(null);

  React.useEffect(() => {
    const handlePaymentRequired = (event) => {
      setLockedBatchData(event.detail);
      setIsPaymentLockedModalOpen(true);
    };

    window.addEventListener('payment-required', handlePaymentRequired);
    return () => window.removeEventListener('payment-required', handlePaymentRequired);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <PaymentLockedModal
        isOpen={isPaymentLockedModalOpen}
        onClose={() => setIsPaymentLockedModalOpen(false)}
        batchData={lockedBatchData}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/role-selection" element={<PublicRoute><RoleSelection /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/consumer/portal" element={<ConsumerPortal />} />
        <Route path="/trace/:publicId" element={<ConsumerTrace />} />

        {/* Registration */}
        <Route path="/register/:role" element={<RegistrationPage />} />

        {/* KYC Status Pages */}
        <Route path="/kyc-pending" element={<KYCPendingPage />} />
        <Route path="/kyc-rejected" element={<KYCRejectedPage />} />

        {/* Admin Routes - Separate from main app */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="kyc" element={<KYCManagement />} />
          <Route path="users" element={<UserManagement />} />
        </Route>

        {/* Farmer Routes */}
        <Route
          path="/farmer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['FARMER']}>
              <FarmerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/batches"
          element={
            <ProtectedRoute allowedRoles={['FARMER']}>
              <FarmerBatches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/payments"
          element={
            <ProtectedRoute allowedRoles={['FARMER']}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        {/* Distributor Routes */}
        <Route
          path="/distributor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['DISTRIBUTOR']}>
              <DistributorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/distributor/incoming"
          element={
            <ProtectedRoute allowedRoles={['DISTRIBUTOR']}>
              <Incoming />
            </ProtectedRoute>
          }
        />
        <Route
          path="/distributor/inventory"
          element={
            <ProtectedRoute allowedRoles={['DISTRIBUTOR']}>
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/distributor/outgoing"
          element={
            <ProtectedRoute allowedRoles={['DISTRIBUTOR']}>
              <Outgoing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/distributor/payments"
          element={
            <ProtectedRoute allowedRoles={['DISTRIBUTOR']}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        {/* Transporter Routes */}
        <Route
          path="/transporter/dashboard"
          element={
            <ProtectedRoute allowedRoles={['TRANSPORTER']}>
              <TransporterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transporter/farmer-shipments"
          element={
            <ProtectedRoute allowedRoles={['TRANSPORTER']}>
              <FarmerShipments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transporter/distributor-shipments"
          element={
            <ProtectedRoute allowedRoles={['TRANSPORTER']}>
              <DistributorShipments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transporter/in-transit"
          element={
            <ProtectedRoute allowedRoles={['TRANSPORTER']}>
              <InTransit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transporter/completed"
          element={
            <ProtectedRoute allowedRoles={['TRANSPORTER']}>
              <Completed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transporter/payments"
          element={
            <ProtectedRoute allowedRoles={['TRANSPORTER']}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        {/* Retailer Routes */}
        <Route
          path="/retailer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['RETAILER']}>
              <RetailerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/incoming"
          element={
            <ProtectedRoute allowedRoles={['RETAILER']}>
              <IncomingTransport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/received"
          element={
            <ProtectedRoute allowedRoles={['RETAILER']}>
              <Received />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/listed"
          element={
            <ProtectedRoute allowedRoles={['RETAILER']}>
              <Listed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/sold"
          element={
            <ProtectedRoute allowedRoles={['RETAILER']}>
              <Sold />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/listing/new"
          element={
            <ProtectedRoute allowedRoles={['RETAILER']}>
              <NewListingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/payments"
          element={
            <ProtectedRoute allowedRoles={['RETAILER']}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        {/* Consumer Routes */}
        <Route
          path="/consumer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['CONSUMER']}>
              <ConsumerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Shared Protected Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['FARMER', 'DISTRIBUTOR', 'TRANSPORTER', 'RETAILER', 'CONSUMER']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
