import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, ChevronDown, LogOut, Globe, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' },
];

const TopNav = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isDark, setIsDark] = useDarkMode();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const userDropdownRef = useRef(null);
  const langDropdownRef = useRef(null);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const getRoleBadgeColor = () => {
    const colors = {
      ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
      FARMER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
      DISTRIBUTOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      TRANSPORTER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
      RETAILER: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
      CONSUMER: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getRoleLabel = () => t(`roles.${role}`, role);

  const handleLogout = async () => {
    setShowUserDropdown(false);
    await logout();
    navigate('/login');
  };

  const handleDarkModeToggle = () => setIsDark(!isDark);

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    setShowLangDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-emerald-100 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left - Role Badge */}
          <div className={`px-4 py-1.5 rounded-full text-sm font-medium ${getRoleBadgeColor()}`}>
            {getRoleLabel()}
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2 md:gap-3">

            {/* Language Dropdown */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-1.5 p-2 text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                title={t('navbar.language')}
              >
                <Globe className="w-5 h-5" />
                <span className="text-xs font-semibold hidden md:block">{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                <ChevronDown className="w-3 h-3 hidden md:block" />
              </button>

              {showLangDropdown && (
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-cosmos-800 rounded-xl shadow-lg border border-emerald-100 dark:border-cosmos-700 py-1 z-50">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-cosmos-400 uppercase tracking-wider border-b border-emerald-50 dark:border-cosmos-700">
                    {t('navbar.language')}
                  </div>
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${i18n.language === lang.code
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold'
                        : 'text-gray-700 dark:text-cosmos-300 hover:bg-emerald-50 dark:hover:bg-cosmos-700/50'
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
              onClick={handleDarkModeToggle}
              className="p-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
              title={isDark ? t('navbar.lightMode') : t('navbar.darkMode')}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-emerald-600 dark:bg-emerald-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user?.username ? user.username.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100 hidden md:block">
                  {user?.username || 'User'}
                </span>
                <ChevronDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-cosmos-800 rounded-xl shadow-lg border border-emerald-100 dark:border-cosmos-700 py-2 z-50">
                  <div className="px-4 py-2 border-b border-emerald-100 dark:border-cosmos-700">
                    <p className="text-sm font-medium text-emerald-900 dark:text-cosmos-300">{user?.username}</p>
                    <p className="text-xs text-emerald-600 dark:text-cosmos-400">{user?.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-emerald-700 dark:text-cosmos-300 hover:bg-emerald-50 dark:hover:bg-cosmos-700/50 transition-colors"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <User className="w-4 h-4" />
                    {t('navbar.profile')}
                  </Link>
                  <div className="border-t border-emerald-100 dark:border-cosmos-700 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('navbar.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
