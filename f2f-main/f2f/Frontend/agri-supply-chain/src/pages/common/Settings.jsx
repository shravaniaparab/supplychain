import React from 'react';
import { Settings as SettingsIcon, Globe, Sun, Moon } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { useToast } from '../../context/ToastContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
];

const Settings = () => {
  const toast = useToast();
  const { t } = useTranslation();
  const [isDark, setIsDark] = useDarkMode();

  const handleDarkModeToggle = () => {
    setIsDark(!isDark);
    toast.success(t('toast.settingsSaved'));
  };

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    toast.success(t('toast.languageChanged'));
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 text-gray-900 dark:text-gray-100">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('settings.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Appearance Section */}
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex-shrink-0">
                  {isDark ? (
                    <Moon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Sun className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{t('settings.appearance')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.appearanceSubtitle')}</p>
                  </div>
                  {/* Dark Mode Toggle Switch */}
                  <button
                    role="switch"
                    aria-checked={isDark}
                    onClick={handleDarkModeToggle}
                    className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors flex-shrink-0 ${isDark ? 'bg-emerald-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-9' : 'translate-x-1'}`} />
                    <span className={`absolute inset-0 flex items-center justify-center text-xs font-semibold ${isDark ? 'left-1 text-white' : 'right-1 text-gray-600'}`}>
                      {isDark ? <Moon className="w-3 h-3 ml-1" /> : <Sun className="w-3 h-3 mr-1 ml-auto" />}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Language Section */}
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex-shrink-0">
                  <Globe className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{t('settings.language')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.languageSubtitle')}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all font-medium text-sm ${
                          i18n.language === lang.code
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                            : 'border-gray-200 dark:border-cosmos-700 text-gray-700 dark:text-cosmos-300 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-cosmos-700/50'
                        }`}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <span>{lang.label}</span>
                        {i18n.language === lang.code && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500"></span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
