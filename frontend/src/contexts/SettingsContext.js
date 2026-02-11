import React, { createContext, useContext, useState, useEffect } from 'react';

const SETTINGS_KEY = 'user_settings_v1';
const EXCHANGE_RATES_KEY = 'exchange_rates_cache';
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

// Default settings
const DEFAULT_SETTINGS = {
  country: 'USA',
  currency: 'USD',
  currencySymbol: '$',
  dateFormat: 'MM/DD/YYYY',
  language: 'en',
};

// Country configurations
export const COUNTRY_CONFIGS = {
  USA: {
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
    taxSystem: 'IRS',
    language: 'en',
  },
  India: {
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    taxSystem: 'ITR',
    language: 'en',
  },
  UK: {
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    dateFormat: 'DD/MM/YYYY',
    taxSystem: 'HMRC',
    language: 'en',
  },
  Canada: {
    name: 'Canada',
    currency: 'CAD',
    currencySymbol: '$',
    dateFormat: 'YYYY-MM-DD',
    taxSystem: 'CRA',
    language: 'en',
  },
  Australia: {
    name: 'Australia',
    currency: 'AUD',
    currencySymbol: '$',
    dateFormat: 'DD/MM/YYYY',
    taxSystem: 'ATO',
    language: 'en',
  },
  Germany: {
    name: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'DD.MM.YYYY',
    taxSystem: 'FA',
    language: 'de',
  },
};

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [exchangeRates, setExchangeRates] = useState({});
  const [ratesLoading, setRatesLoading] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }

      // Load cached exchange rates
      const cachedRates = localStorage.getItem(EXCHANGE_RATES_KEY);
      if (cachedRates) {
        const { rates, timestamp } = JSON.parse(cachedRates);
        // Use cache if less than 1 hour old
        if (Date.now() - timestamp < 3600000) {
          setExchangeRates(rates);
        } else {
          fetchExchangeRates();
        }
      } else {
        fetchExchangeRates();
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  // Fetch exchange rates from API
  const fetchExchangeRates = async () => {
    setRatesLoading(true);
    try {
      const response = await fetch(EXCHANGE_RATE_API);
      if (response.ok) {
        const data = await response.json();
        setExchangeRates(data.rates || {});
        // Cache the rates
        localStorage.setItem(EXCHANGE_RATES_KEY, JSON.stringify({
          rates: data.rates,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.error('Failed to fetch exchange rates:', err);
      // Use fallback rates
      setExchangeRates({
        USD: 1,
        INR: 83.5,
        EUR: 0.92,
        GBP: 0.79,
        CAD: 1.36,
        AUD: 1.54,
      });
    } finally {
      setRatesLoading(false);
    }
  };

  // Convert amount from one currency to another
  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (!amount || fromCurrency === toCurrency) return amount;

    const amountNum = parseFloat(amount) || 0;

    // Convert to USD first (base currency), then to target
    const fromRate = exchangeRates[fromCurrency] || 1;
    const toRate = exchangeRates[toCurrency] || 1;

    const amountInUSD = amountNum / fromRate;
    const convertedAmount = amountInUSD * toRate;

    return Math.round(convertedAmount * 100) / 100;
  };

  // Get current month name and year
  const getCurrentMonthLabel = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get short month label
  const getShortMonthLabel = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  };

  const setCountry = (countryCode) => {
    const config = COUNTRY_CONFIGS[countryCode];
    if (config) {
      updateSettings({
        country: countryCode,
        currency: config.currency,
        currencySymbol: config.currencySymbol,
        dateFormat: config.dateFormat,
      });
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return `${settings.currencySymbol}0`;
    return new Intl.NumberFormat(settings.country === 'India' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: settings.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(settings.country === 'India' ? 'en-IN' : 'en-US', options);
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      setCountry,
      formatCurrency,
      formatDate,
      convertCurrency,
      getCurrentMonthLabel,
      getShortMonthLabel,
      exchangeRates,
      ratesLoading,
      fetchExchangeRates,
      countries: Object.keys(COUNTRY_CONFIGS),
      countryConfigs: COUNTRY_CONFIGS,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
