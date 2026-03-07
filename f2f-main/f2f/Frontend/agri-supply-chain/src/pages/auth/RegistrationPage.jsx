import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Sprout, User, Mail, Lock, Phone, Building2, MapPin, ArrowLeft, Loader2, CheckCircle, FileText, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const RegistrationPage = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    organization: '',
    address: '',
    wallet_id: '',
  });

  const [documentFile, setDocumentFile] = useState(null);
  const [documentName, setDocumentName] = useState('');

  const roleConfig = {
    farmer: {
      title: 'Farmer',
      subtitle: 'Join as a Farmer to sell your produce',
      icon: <Sprout className="w-6 h-6" />,
      fields: ['organization', 'address'],
      labels: { organization: 'Farm Name', address: 'Farm Address (Village/District/State)' },
      documentLabel: 'Land Document',
      documentPlaceholder: 'Upload land ownership document',
    },
    distributor: {
      title: 'Distributor',
      subtitle: 'Join as a Distributor to manage supply chain',
      icon: <Building2 className="w-6 h-6" />,
      fields: ['organization', 'address'],
      labels: { organization: 'Company Name', address: 'Business Address (City/State)' },
      documentLabel: 'Trade License',
      documentPlaceholder: 'Upload trade license document',
    },
    transporter: {
      title: 'Transporter',
      subtitle: 'Join as a Transporter to handle logistics',
      icon: <User className="w-6 h-6" />,
      fields: ['organization', 'address'],
      labels: { organization: 'Transport Company Name', address: 'Office Address (City/State)' },
      documentLabel: 'Driver/Transport License',
      documentPlaceholder: 'Upload transport license',
    },
    retailer: {
      title: 'Retailer',
      subtitle: 'Join as a Retailer to sell to consumers',
      icon: <Building2 className="w-6 h-6" />,
      fields: ['organization', 'address'],
      labels: { organization: 'Shop Name', address: 'Shop Address (Market/City)' },
      documentLabel: 'Shop License',
      documentPlaceholder: 'Upload shop/business license',
    },
    consumer: {
      title: 'Consumer',
      subtitle: 'Join as a Consumer to trace products',
      icon: <User className="w-6 h-6" />,
      fields: [],
      labels: {},
      documentLabel: null,
      documentPlaceholder: null,
    },
  };

  const config = roleConfig[role] || roleConfig.consumer;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocumentFile(file);
      setDocumentName(file.name);
    }
  };

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.password) {
      setError('Please fill all required fields');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (config.documentLabel && !documentFile) {
      setError(`Please upload your ${config.documentLabel}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // Use FormData to send file
      const formDataToSend = new FormData();
      formDataToSend.append('username', formData.username);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('role', role.toUpperCase());
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('organization', formData.organization);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('wallet_id', formData.wallet_id);
      
      // Append document file if exists
      if (documentFile) {
        formDataToSend.append('document', documentFile);
        formDataToSend.append('document_type', config.documentLabel);
      }

      await register(formDataToSend);
      setSuccess(true);
      setTimeout(() => {
        navigate('/kyc-pending');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">
            Your account has been created. You can use the dashboard after KYC approval.
          </p>
          <Link to="/kyc-pending" className="btn-primary inline-block">
            Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">AgriChain</span>
            </Link>
            <Link to="/role-selection" className="flex items-center gap-1 text-gray-600 hover:text-primary">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-primary/5 border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-white p-2 rounded-lg">
                {config.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{config.title} Registration</h1>
                <p className="text-sm text-gray-500">{config.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Information Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Account Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className="input-field pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        className="input-field pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min 8 characters"
                        className="input-field pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm your password"
                        className="input-field pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Information Section */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Profile Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="input-field pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Wallet ID</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="wallet_id"
                        value={formData.wallet_id}
                        onChange={handleChange}
                        placeholder="Enter your wallet address"
                        className="input-field pl-3"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">For blockchain payments</p>
                  </div>
                  {config.fields.includes('organization') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {config.labels.organization}
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          name="organization"
                          value={formData.organization}
                          onChange={handleChange}
                          placeholder={`Enter ${config.labels.organization}`}
                          className="input-field pl-10"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {config.fields.includes('address') && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {config.labels.address}
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows="2"
                        placeholder={`Enter ${config.labels.address}`}
                        className="input-field pl-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Document Upload Section - Role Based */}
              {config.documentLabel && (
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Document Verification
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {config.documentLabel} *
                    </label>
                    <div className="relative">
                      <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer">
                          <div className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${
                            documentFile 
                              ? 'border-emerald-500 bg-emerald-50' 
                              : 'border-gray-300 hover:border-primary bg-gray-50'
                          }`}>
                            <Upload className={`w-5 h-5 ${documentFile ? 'text-emerald-600' : 'text-gray-400'}`} />
                            <div className="flex-1">
                              <p className={`text-sm ${documentFile ? 'text-emerald-700 font-medium' : 'text-gray-600'}`}>
                                {documentName || config.documentPlaceholder}
                              </p>
                              <p className="text-xs text-gray-400">
                                {documentFile ? 'File selected' : 'Click to upload PDF, JPG, or PNG'}
                              </p>
                            </div>
                          </div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        {documentFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setDocumentFile(null);
                              setDocumentName('');
                            }}
                            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Please upload a clear image or PDF of your {config.documentLabel.toLowerCase()} for verification.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Complete Registration</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default RegistrationPage;
