import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Menu, X, User, Settings, Sun, Moon, LogOut, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import MobileBottomNav from './MobileBottomNav';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' },
];

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isDark, setIsDark] = useDarkMode();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showMobileUserDropdown, setShowMobileUserDropdown] = useState(false);
  const [showMobileLangDropdown, setShowMobileLangDropdown] = useState(false);
  const userDropdownRef = useRef(null);
  const langDropdownRef = useRef(null);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const toggleMobileDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const closeMobileDrawer = () => {
    setMobileDrawerOpen(false);
  };

  const handleMobileLogout = async () => {
    setShowMobileUserDropdown(false);
    await logout();
    navigate('/login');
  };

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    setShowMobileLangDropdown(false);
  };

  // Click outside to close mobile dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowMobileUserDropdown(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setShowMobileLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeMobileDrawer}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      {mobileDrawerOpen && (
        <div className="fixed left-0 top-0 h-full w-72 z-40 md:hidden">
          <div className="flex flex-col h-full bg-emerald-50 dark:bg-surface-dark">
            <div className="flex items-center justify-between p-4 border-b border-emerald-200 dark:border-emerald-900">
              <div className="flex items-center gap-2">
                <Sprout className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <span className="text-lg font-bold text-emerald-900 dark:text-emerald-100">AgriChain</span>
              </div>
              <button
                onClick={closeMobileDrawer}
                className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-emerald-50 dark:bg-surface-dark border-b border-emerald-200 dark:border-emerald-900 px-4 py-3 flex items-center justify-between">
          <button
            onClick={toggleMobileDrawer}
            className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
          </button>
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">AgriChain</span>
          </div>
          <div className="flex items-center gap-1">

            {/* Language Dropdown */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setShowMobileLangDropdown(!showMobileLangDropdown)}
                className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors text-emerald-600 dark:text-emerald-400"
                title={t('navbar.language')}
              >
                <Globe className="w-5 h-5" />
              </button>
              {showMobileLangDropdown && (
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-emerald-100 dark:border-emerald-900 py-2 z-50">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider border-b border-emerald-100 dark:border-emerald-900">
                    {t('navbar.language')}
                  </div>
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${i18n.language === lang.code
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                        }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.label}</span>
                      {i18n.language === lang.code && <span className="ml-auto text-emerald-500">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors text-emerald-600 dark:text-emerald-400"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User Avatar Dropdown */}
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => { setShowMobileUserDropdown(!showMobileUserDropdown); }}
                className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-700 flex items-center justify-center text-white font-semibold text-sm hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
              >
                {user?.username ? user.username.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </button>
              {showMobileUserDropdown && (
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-emerald-100 dark:border-emerald-900 py-2 z-50">
                  <div className="px-4 py-2 border-b border-emerald-100 dark:border-emerald-900">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('navbar.signedInAs')}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.username}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setShowMobileUserDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    {t('navbar.profile')}
                  </Link>
                  <div className="border-t border-emerald-100 dark:border-emerald-900 mt-1 pt-1">
                    <button
                      onClick={handleMobileLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('navbar.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Top Navigation */}
        <div className="hidden md:block">
          <TopNav />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 pt-16 md:pt-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
