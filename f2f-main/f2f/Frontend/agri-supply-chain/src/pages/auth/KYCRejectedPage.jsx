import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, XCircle, HelpCircle, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const KYCRejectedPage = () => {
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
              Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            KYC Verification Rejected
          </h1>
          <p className="text-gray-600 mb-6">
            Unfortunately, your KYC verification has been rejected. Your account is currently suspended.
          </p>

          {/* Status Box */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">KYC Rejected</span>
            </div>
            <p className="text-xs text-red-600">
              Rejection reason not available in system. Please contact support.
            </p>
          </div>

          {/* Help Section */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-primary" />
              <span className="font-medium text-gray-700">Help & Support</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              If you believe this is an error, or if you want to appeal this decision, please contact our support team.
            </p>
            
            <div className="space-y-3">
              <a 
                href="mailto:support@agrichain.in" 
                className="flex items-center justify-center gap-2 py-2 px-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm">support@agrichain.in</span>
              </a>
              <a 
                href="tel:+911800AGRICHAIN" 
                className="flex items-center justify-center gap-2 py-2 px-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm">+91 1800-AGRICHAIN</span>
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={logout}
              className="btn-primary py-3"
            >
              Back to Login Page
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default KYCRejectedPage;
