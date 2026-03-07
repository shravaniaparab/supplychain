import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Mail, Lock, Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import PublicTopNav from '../../components/layout/PublicTopNav';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';

const LoginPage = () => {
  const [isDark, setIsDark] = useDarkMode();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { role } = await login(formData);

      // Direct redirect to role-based dashboard (no KYC check)
      navigate(`/${role.toLowerCase()}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'dark bg-slate-950' : 'bg-gray-50'}`}>
      <PublicTopNav />
      <div className="h-16"></div> {/* Spacer for fixed nav */}

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-cosmos-900 rounded-2xl shadow-2xl overflow-hidden min-h-[600px] border border-gray-100 dark:border-cosmos-800">
          {/* Left Side - Login Form */}
          <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sprout className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-2xl tracking-tight text-emerald-600 dark:text-emerald-400">{t('common.appName')}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('login.welcomeBack')}</h1>
              <p className="text-gray-500 dark:text-cosmos-400">{t('login.subtitle')}</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-cosmos-200 mb-2">
                  {t('login.emailLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 dark:text-cosmos-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('login.emailPlaceholder')}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-cosmos-800 border border-gray-200 dark:border-cosmos-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-cosmos-200 mb-2">
                  {t('login.passwordLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-cosmos-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('login.passwordPlaceholderDots')}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-cosmos-800 border border-gray-200 dark:border-cosmos-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-cosmos-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('login.signingIn')}</span>
                  </>
                ) : (
                  <span>{t('login.signIn')}</span>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 dark:text-cosmos-400">
                {t('login.dontHaveAccount')}{' '}
                <Link to="/role-selection" className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                  {t('login.signUp')}
                </Link>
              </p>
            </div>
          </div>

          {/* Right Side - Image & Context */}
          <div className="hidden md:block relative bg-primary">
            <img
              src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&fit=crop&q=80"
              alt="Indian Agriculture"
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-primary/40"></div>
            <div className="relative z-10 h-full flex flex-col justify-between p-12 text-white">
              <div className="flex justify-end">
                <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium border border-white/20">
                  {t('login.blockchainNode')}
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-3xl font-bold">
                  {t('login.join')}
                </h2>
                <p className="text-lg text-green-100">
                  {t('login.description')}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <p className="text-2xl font-bold">{t('login.farmerEarningsValue')}</p>
                    <p className="text-sm text-green-200">{t('login.farmerEarnings')}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <p className="text-2xl font-bold">{t('login.farmerFamiliesValue')}</p>
                    <p className="text-sm text-green-200">{t('login.farmerFamilies')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
