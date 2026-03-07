import { useTranslation } from 'react-i18next';

/**
 * Hook to format numbers according to the current language locale.
 * Hindi, Marathi, Punjabi and Gujarati use their respective numerals via Intl.NumberFormat.
 *
 * Usage:
 *   const { formatNumber, formatCurrency } = useLocalizedNumber();
 *   formatNumber(10)       // "10" in English, "१०" in Hindi/Marathi, "੧੦" in Punjabi, "૧૦" in Gujarati
 *   formatCurrency(500)    // "₹500" localized
 */
export function useLocalizedNumber() {
  const { i18n } = useTranslation();

  const localeMap = {
    en: { locale: 'en-IN', numberingSystem: 'latn' },
    hi: { locale: 'hi-IN', numberingSystem: 'deva' },
    mr: { locale: 'mr-IN', numberingSystem: 'deva' },
    pa: { locale: 'pa-IN', numberingSystem: 'guru' },
    gu: { locale: 'gu-IN', numberingSystem: 'gujr' },
  };

  const config = localeMap[i18n.language] || localeMap.en;

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '';
    return new Intl.NumberFormat(config.locale, {
      numberingSystem: config.numberingSystem
    }).format(Number(num));
  };

  const formatCurrency = (num, currency = 'INR') => {
    if (num === null || num === undefined || num === '') return '';
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      numberingSystem: config.numberingSystem
    }).format(Number(num));
  };

  const formatCompact = (num) => {
    if (num === null || num === undefined || num === '') return '';
    return new Intl.NumberFormat(config.locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
      numberingSystem: config.numberingSystem
    }).format(Number(num));
  };

  return { formatNumber, formatCurrency, formatCompact, locale: config.locale };
}

export default useLocalizedNumber;
