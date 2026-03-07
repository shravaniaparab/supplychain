import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Globe,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
];

const AdminLayout = () => {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isDark, setIsDark] = useDarkMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langDropdownRef = useRef(null);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    setShowLangDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Only allow admin access
  if (role?.toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin portal.</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/kyc', icon: FileCheck, label: 'KYC Management' },
    { path: '/admin/users', icon: Users, label: 'User Management' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className={`min-h-screen bg-gray-100 dark:bg-cosmos-900 ${isDark ? 'dark' : ''}`}>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-cosmos-800 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-green-600" />
          <span className="text-xl font-bold text-gray-900 dark:text-white">Admin Portal</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Language dropdown mobile */}
          <div className="relative" ref={langDropdownRef}>
            <button onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-1 p-2 rounded-lg bg-gray-100 dark:bg-cosmos-700 text-gray-700 dark:text-cosmos-300">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-semibold">{currentLang.flag}</span>
            </button>
            {showLangDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-cosmos-800 rounded-xl shadow-lg border border-gray-100 dark:border-cosmos-700 py-1 z-50">
                {LANGUAGES.map(lang => (
                  <button key={lang.code} onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${i18n.language === lang.code ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700 dark:text-cosmos-300 hover:bg-gray-50'}`}>
                    <span>{lang.flag}</span><span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Dark mode mobile */}
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-lg bg-gray-100 dark:bg-cosmos-700 text-gray-700 dark:text-cosmos-300">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-cosmos-700">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-cosmos-800 shadow-lg transition-transform duration-200 ease-in-out`}
        >
          <div className="h-full flex flex-col">
            {/* Logo + top controls */}
            <div className="p-6 border-b dark:border-cosmos-700 hidden lg:flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-green-600" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">Admin Portal</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Language dropdown desktop */}
                <div className="relative" ref={langDropdownRef}>
                  <button onClick={() => setShowLangDropdown(!showLangDropdown)}
                    className="flex items-center gap-1 p-1.5 rounded-lg bg-gray-100 dark:bg-cosmos-700 text-gray-600 dark:text-cosmos-300 text-xs">
                    <Globe className="w-4 h-4" />
                    <span>{currentLang.flag}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showLangDropdown && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-cosmos-800 rounded-xl shadow-lg border border-gray-100 dark:border-cosmos-700 py-1 z-50">
                      {LANGUAGES.map(lang => (
                        <button key={lang.code} onClick={() => handleLanguageChange(lang.code)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${i18n.language === lang.code ? 'bg-green-50 dark:bg-green-900/20 text-green-700 font-semibold' : 'text-gray-700 dark:text-cosmos-300 hover:bg-gray-50 dark:hover:bg-cosmos-700'}`}>
                          <span>{lang.flag}</span><span>{lang.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Dark mode desktop */}
                <button onClick={() => setIsDark(!isDark)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-cosmos-700 text-gray-600 dark:text-cosmos-300">
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium'
                      : 'text-gray-600 dark:text-cosmos-300 hover:bg-gray-50 dark:hover:bg-cosmos-700 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t dark:border-cosmos-700">
              <div className="flex items-center gap-3 mb-4 px-4">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-green-700 dark:text-green-400 font-medium">
                    {user?.username?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.username || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-cosmos-400">{t('sidebar.administrator')}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                {t('navbar.logout')}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0 dark:bg-cosmos-900">
          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div className="p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
