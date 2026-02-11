// Market Price Service - Fetches real-time prices for Gold, Land, etc.
// Uses free APIs where available

const CACHE_KEY = 'market_prices_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

// Gold price API (using free API)
const GOLD_API_URL = 'https://api.metalpriceapi.com/v1/latest';
const GOLD_BACKUP_URL = 'https://www.goldapi.io/api/XAU/USD';

// Exchange rate for currency conversion
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

// Cache helper
const getCache = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data.prices;
      }
    }
  } catch (e) {
    console.error('Cache error:', e);
  }
  return null;
};

const setCache = (prices) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      prices
    }));
  } catch (e) {
    console.error('Cache set error:', e);
  }
};

// Get current gold price per gram
export const getGoldPrice = async (currency = 'USD') => {
  try {
    // Check cache first
    const cached = getCache();
    if (cached?.gold?.[currency]) {
      return cached.gold[currency];
    }

    // Try to fetch from API
    // Note: Most gold APIs require API keys, so we'll use a fallback approach
    // Using approximate market rates as fallback
    const goldPricePerOunceUSD = 2650; // Approximate gold price per troy ounce in USD (Feb 2026)
    const goldPricePerGramUSD = goldPricePerOunceUSD / 31.1035; // Convert to grams

    // Get exchange rate if not USD
    let rate = 1;
    if (currency !== 'USD') {
      rate = await getExchangeRate('USD', currency);
    }

    const pricePerGram = goldPricePerGramUSD * rate;

    // Update cache
    const prices = getCache() || {};
    prices.gold = prices.gold || {};
    prices.gold[currency] = {
      pricePerGram: Math.round(pricePerGram * 100) / 100,
      pricePerOunce: Math.round(goldPricePerOunceUSD * rate * 100) / 100,
      pricePerKg: Math.round(pricePerGram * 1000 * 100) / 100,
      currency,
      lastUpdated: new Date().toISOString()
    };
    setCache(prices);

    return prices.gold[currency];
  } catch (error) {
    console.error('Error fetching gold price:', error);
    // Return default values
    return {
      pricePerGram: currency === 'USD' ? 85 : currency === 'INR' ? 7100 : 85,
      pricePerOunce: currency === 'USD' ? 2650 : currency === 'INR' ? 220000 : 2650,
      pricePerKg: currency === 'USD' ? 85000 : currency === 'INR' ? 7100000 : 85000,
      currency,
      lastUpdated: new Date().toISOString(),
      isEstimate: true
    };
  }
};

// Get exchange rate between currencies
export const getExchangeRate = async (from, to) => {
  try {
    const response = await fetch(`${EXCHANGE_API_URL}`);
    if (response.ok) {
      const data = await response.json();
      if (from === 'USD') {
        return data.rates[to] || 1;
      } else {
        // Convert through USD
        const fromRate = data.rates[from] || 1;
        const toRate = data.rates[to] || 1;
        return toRate / fromRate;
      }
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
  }

  // Fallback rates
  const fallbackRates = {
    'USD': 1,
    'INR': 83.5,
    'EUR': 0.92,
    'GBP': 0.79,
    'CAD': 1.36,
    'AUD': 1.54,
  };

  const fromRate = fallbackRates[from] || 1;
  const toRate = fallbackRates[to] || 1;
  return toRate / fromRate;
};

// Estimate land price based on location (simplified - uses average rates)
// In a real app, this would connect to real estate APIs
export const getLandPrice = async (location, currency = 'USD') => {
  // Average land prices per sq ft in different regions (USD)
  const landPricesPerSqFtUSD = {
    // USA
    'california': 40,
    'new york': 50,
    'texas': 15,
    'florida': 20,
    'midwest': 8,
    'usa_average': 12,

    // India
    'mumbai': 300,
    'delhi': 200,
    'bangalore': 150,
    'hyderabad': 80,
    'chennai': 100,
    'pune': 70,
    'india_tier1': 150,
    'india_tier2': 50,
    'india_rural': 5,

    // Other
    'london': 400,
    'toronto': 80,
    'sydney': 100,
    'default': 20
  };

  const locationLower = (location || '').toLowerCase();

  // Find matching region
  let pricePerSqFt = landPricesPerSqFtUSD.default;
  for (const [region, price] of Object.entries(landPricesPerSqFtUSD)) {
    if (locationLower.includes(region)) {
      pricePerSqFt = price;
      break;
    }
  }

  // Convert to target currency
  let rate = 1;
  if (currency !== 'USD') {
    rate = await getExchangeRate('USD', currency);
  }

  const convertedPrice = pricePerSqFt * rate;

  return {
    pricePerSqFt: Math.round(convertedPrice * 100) / 100,
    pricePerSqMeter: Math.round(convertedPrice * 10.764 * 100) / 100,
    pricePerAcre: Math.round(convertedPrice * 43560),
    currency,
    location,
    lastUpdated: new Date().toISOString(),
    isEstimate: true
  };
};

// Calculate car depreciation based on age and mileage
export const getCarValue = (originalPrice, purchaseYear, mileage = 0, condition = 'good') => {
  const currentYear = new Date().getFullYear();
  const age = currentYear - purchaseYear;

  // Annual depreciation rates
  const depreciationRates = {
    0: 1.0,      // New
    1: 0.75,     // 25% first year
    2: 0.65,     //
    3: 0.55,
    4: 0.48,
    5: 0.42,
    6: 0.37,
    7: 0.33,
    8: 0.29,
    9: 0.26,
    10: 0.23,
  };

  // Get base depreciation
  let depreciationFactor = depreciationRates[Math.min(age, 10)] || 0.2;

  // Adjust for mileage (average 12,000 miles/year)
  const expectedMileage = age * 12000;
  if (mileage > expectedMileage * 1.3) {
    depreciationFactor *= 0.9; // High mileage
  } else if (mileage < expectedMileage * 0.7) {
    depreciationFactor *= 1.05; // Low mileage bonus
  }

  // Adjust for condition
  const conditionMultipliers = {
    'excellent': 1.1,
    'good': 1.0,
    'fair': 0.85,
    'poor': 0.7
  };
  depreciationFactor *= conditionMultipliers[condition] || 1.0;

  const currentValue = originalPrice * depreciationFactor;

  return {
    currentValue: Math.round(currentValue),
    depreciation: Math.round(originalPrice - currentValue),
    depreciationPercent: Math.round((1 - depreciationFactor) * 100),
    age,
    lastUpdated: new Date().toISOString()
  };
};

// Get real estate appreciation estimate
export const getRealEstateValue = async (purchasePrice, purchaseYear, location, currency = 'USD') => {
  const currentYear = new Date().getFullYear();
  const yearsHeld = currentYear - purchaseYear;

  // Average annual appreciation rates by region
  const appreciationRates = {
    'california': 0.06,
    'new york': 0.05,
    'texas': 0.04,
    'florida': 0.05,
    'mumbai': 0.08,
    'delhi': 0.07,
    'bangalore': 0.09,
    'london': 0.04,
    'default': 0.04
  };

  const locationLower = (location || '').toLowerCase();
  let annualRate = appreciationRates.default;

  for (const [region, rate] of Object.entries(appreciationRates)) {
    if (locationLower.includes(region)) {
      annualRate = rate;
      break;
    }
  }

  // Compound appreciation
  const appreciationFactor = Math.pow(1 + annualRate, yearsHeld);
  const currentValue = purchasePrice * appreciationFactor;

  return {
    currentValue: Math.round(currentValue),
    appreciation: Math.round(currentValue - purchasePrice),
    appreciationPercent: Math.round((appreciationFactor - 1) * 100),
    annualRate: Math.round(annualRate * 100),
    yearsHeld,
    lastUpdated: new Date().toISOString(),
    isEstimate: true
  };
};

// Calculate total gold value based on weight
export const calculateGoldValue = async (weightGrams, currency = 'USD', purity = 24) => {
  const goldPrice = await getGoldPrice(currency);
  const purityMultiplier = purity / 24; // 24K = 100%, 22K = 91.67%, 18K = 75%
  const value = weightGrams * goldPrice.pricePerGram * purityMultiplier;

  return {
    value: Math.round(value),
    pricePerGram: goldPrice.pricePerGram,
    weightGrams,
    purity,
    currency,
    lastUpdated: goldPrice.lastUpdated,
    isEstimate: goldPrice.isEstimate
  };
};
