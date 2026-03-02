'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  flag: string;
  region: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  // Americas
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', flag: '🇺🇸', region: 'Americas' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA', flag: '🇨🇦', region: 'Americas' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', locale: 'es-MX', flag: '🇲🇽', region: 'Americas' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR', flag: '🇧🇷', region: 'Americas' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', locale: 'es-AR', flag: '🇦🇷', region: 'Americas' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', locale: 'es-CL', flag: '🇨🇱', region: 'Americas' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', locale: 'es-CO', flag: '🇨🇴', region: 'Americas' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', locale: 'es-PE', flag: '🇵🇪', region: 'Americas' },

  // Europe
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB', flag: '🇬🇧', region: 'Europe' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE', flag: '🇪🇺', region: 'Europe' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH', flag: '🇨🇭', region: 'Europe' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', locale: 'nb-NO', flag: '🇳🇴', region: 'Europe' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', locale: 'sv-SE', flag: '🇸🇪', region: 'Europe' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', locale: 'da-DK', flag: '🇩🇰', region: 'Europe' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', locale: 'pl-PL', flag: '🇵🇱', region: 'Europe' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', locale: 'cs-CZ', flag: '🇨🇿', region: 'Europe' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', locale: 'hu-HU', flag: '🇭🇺', region: 'Europe' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', locale: 'ro-RO', flag: '🇷🇴', region: 'Europe' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', locale: 'ru-RU', flag: '🇷🇺', region: 'Europe' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', locale: 'tr-TR', flag: '🇹🇷', region: 'Europe' },

  // Asia & Pacific
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP', flag: '🇯🇵', region: 'Asia & Pacific' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN', flag: '🇨🇳', region: 'Asia & Pacific' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN', flag: '🇮🇳', region: 'Asia & Pacific' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', locale: 'ko-KR', flag: '🇰🇷', region: 'Asia & Pacific' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', locale: 'zh-HK', flag: '🇭🇰', region: 'Asia & Pacific' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG', flag: '🇸🇬', region: 'Asia & Pacific' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', locale: 'zh-TW', flag: '🇹🇼', region: 'Asia & Pacific' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', locale: 'th-TH', flag: '🇹🇭', region: 'Asia & Pacific' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', locale: 'en-MY', flag: '🇲🇾', region: 'Asia & Pacific' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', locale: 'id-ID', flag: '🇮🇩', region: 'Asia & Pacific' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', locale: 'en-PH', flag: '🇵🇭', region: 'Asia & Pacific' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', locale: 'vi-VN', flag: '🇻🇳', region: 'Asia & Pacific' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', locale: 'en-PK', flag: '🇵🇰', region: 'Asia & Pacific' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', locale: 'bn-BD', flag: '🇧🇩', region: 'Asia & Pacific' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU', flag: '🇦🇺', region: 'Asia & Pacific' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ', flag: '🇳🇿', region: 'Asia & Pacific' },

  // Middle East
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE', flag: '🇦🇪', region: 'Middle East' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', locale: 'ar-SA', flag: '🇸🇦', region: 'Middle East' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', locale: 'ar-QA', flag: '🇶🇦', region: 'Middle East' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', locale: 'ar-KW', flag: '🇰🇼', region: 'Middle East' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', locale: 'ar-BH', flag: '🇧🇭', region: 'Middle East' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£', locale: 'ar-EG', flag: '🇪🇬', region: 'Middle East' },

  // Africa
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA', flag: '🇿🇦', region: 'Africa' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG', flag: '🇳🇬', region: 'Africa' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', locale: 'sw-KE', flag: '🇰🇪', region: 'Africa' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', locale: 'en-GH', flag: '🇬🇭', region: 'Africa' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', locale: 'ar-MA', flag: '🇲🇦', region: 'Africa' },
];

// Grouping helper
export const CURRENCY_REGIONS = Array.from(
  new Set(SUPPORTED_CURRENCIES.map((c) => c.region))
);

export const getCurrenciesByRegion = (region: string): Currency[] =>
  SUPPORTED_CURRENCIES.filter((c) => c.region === region);

interface CurrencyContextType {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  formatCurrency: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency>(
    SUPPORTED_CURRENCIES.find((c) => c.code === 'GBP') ?? SUPPORTED_CURRENCIES[0]
  );

  // Load currency preference from localStorage on mount
  useEffect(() => {
    const savedCurrencyCode = localStorage.getItem('finance-currency');
    if (savedCurrencyCode) {
      const savedCurrency = SUPPORTED_CURRENCIES.find((currency) => currency.code === savedCurrencyCode);
      if (savedCurrency) {
        setSelectedCurrencyState(savedCurrency);
      }
    }
  }, []);

  // Save to localStorage whenever currency changes
  const setSelectedCurrency = (currency: Currency) => {
    setSelectedCurrencyState(currency);
    localStorage.setItem('finance-currency', currency.code);
  };

  const formatCurrency = (amount: number): string => {
    try {
      return new Intl.NumberFormat(selectedCurrency.locale, {
        style: 'currency',
        currency: selectedCurrency.code,
      }).format(amount);
    } catch {
      // Fallback if the locale/code combo is unsupported by the runtime
      return `${selectedCurrency.symbol}${amount.toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        setSelectedCurrency,
        formatCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};
