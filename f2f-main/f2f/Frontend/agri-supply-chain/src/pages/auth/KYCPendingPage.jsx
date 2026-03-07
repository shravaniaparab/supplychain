import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Clock, CheckCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const KYCPendingPage = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">AgriChain</span>
            </Link>
            <button
              onClick={logout}
              className="text-gray-600 hover:text-primary font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">KYC Verification Pending</h1>
          <p className="text-gray-600 mb-6">
            Your account has been successfully created. You can only use the dashboard after KYC verification is complete.
          </p>

          {/* Status Box */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-gray-700">Verification in Process</span>
            </div>
            <p className="text-xs text-gray-500">
              This process may take 24-48 hours
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-primary/5 rounded-lg p-4">
              <CheckCircle className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Account Created</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">KYC Pending</p>
            </div>
          </div>

          {/* Help */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
              <HelpCircle className="w-4 h-4" />
              <span>Need help?</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              If you have any issues, please contact our support team
            </p>
            <a
              href="mailto:support@agrichain.in"
              className="text-primary font-medium hover:underline"
            >
              support@agrichain.in
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default KYCPendingPage;
