// Market Price Service - Fetches real-time prices for Gold, Land, etc.
// Uses free APIs where available

const CACHE_KEY = 'market_prices_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache

// Gold price API (using free API)
const GOLD_API_URL = 'https://api.metalpriceapi.com/v1/latest';
const GOLD_BACKUP_URL = 'https://www.goldapi.io/api/XAU/USD';

// Exchange rate for currency conversion
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

// Clear cache (useful when prices need to be refreshed)
export const clearMarketPriceCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    return true;
  } catch (e) {
    console.error('Failed to clear cache:', e);
    return false;
  }
};

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

    // Base gold price (Feb 2026): ~ $163.4 per gram (≈$1,634 per 10g)
    let goldPricePerGramUSD = 163.4;

    try {
      // Try fetching from a free gold API (NBP gives PLN per gram)
      const response = await fetch('https://api.nbp.pl/api/cenyzlota/?format=json');
      if (response.ok) {
        const data = await response.json();
        const plnToUsd = 0.25; // Approx PLN→USD (1 PLN ≈ 0.25 USD)
        const priceInPLN = data[0]?.cena || 660; // PLN per gram
        goldPricePerGramUSD = priceInPLN * plnToUsd; // Convert correctly (multiply, not divide)
      }
    } catch (apiError) {
      console.log('Using fallback gold price');
    }

    // Get exchange rate if not USD
    let rate = 1;
    if (currency !== 'USD') {
      rate = await getExchangeRate('USD', currency);
    }

    const pricePerGram = goldPricePerGramUSD * rate;
    const pricePerOunce = pricePerGram * 31.1035;

    // Update cache
    const prices = getCache() || {};
    prices.gold = prices.gold || {};
    prices.gold[currency] = {
      pricePerGram: Math.round(pricePerGram * 100) / 100,
      pricePerOunce: Math.round(pricePerOunce * 100) / 100,
      pricePerKg: Math.round(pricePerGram * 1000 * 100) / 100,
      currency,
      lastUpdated: new Date().toISOString()
    };
    setCache(prices);

    return prices.gold[currency];
  } catch (error) {
    console.error('Error fetching gold price:', error);
    // Return default values based on currency (Feb 2026 prices ~ $163.4/g)
    const defaultPrices = {
      USD: { perGram: 163.4 },
      INR: { perGram: 163.4 * 83.5 }, // ≈ ₹13,644 per gram
      EUR: { perGram: 150 },
      GBP: { perGram: 128 }
    };
    const prices = defaultPrices[currency] || defaultPrices.USD;

    return {
      pricePerGram: prices.perGram,
      pricePerOunce: prices.perGram * 31.1035,
      pricePerKg: prices.perGram * 1000,
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

// Calculate car depreciation based on age, mileage, type, and condition
export const getCarValue = (originalPrice, purchaseYear, mileage = 0, condition = 'good', carType = 'sedan') => {
  const currentYear = new Date().getFullYear();
  const age = currentYear - purchaseYear;

  // Base annual depreciation rates (percentage of original value retained)
  const depreciationRates = {
    0: 1.0,      // New
    1: 0.75,     // 25% first year depreciation
    2: 0.65,     // 35% total
    3: 0.55,     // 45% total
    4: 0.48,     // 52% total
    5: 0.42,     // 58% total
    6: 0.37,
    7: 0.33,
    8: 0.29,
    9: 0.26,
    10: 0.23,
    11: 0.21,
    12: 0.19,
    13: 0.17,
    14: 0.15,
    15: 0.13,
  };

  // Car type depreciation modifiers (some cars hold value better)
  const carTypeModifiers = {
    // Luxury cars depreciate faster
    'luxury': 0.85,
    'bmw': 0.85,
    'mercedes': 0.85,
    'audi': 0.87,
    'lexus': 0.95,

    // Trucks and SUVs hold value better
    'truck': 1.1,
    'pickup': 1.1,
    'suv': 1.05,
    'jeep': 1.08,

    // Economy cars - average depreciation
    'sedan': 1.0,
    'compact': 0.95,
    'hatchback': 0.95,

    // Electric vehicles
    'electric': 0.9,
    'tesla': 0.92,
    'ev': 0.9,

    // Sports cars
    'sports': 0.88,
    'coupe': 0.92,

    // Japanese brands hold value well
    'toyota': 1.08,
    'honda': 1.06,
    'subaru': 1.05,

    // Default
    'default': 1.0
  };

  // Get base depreciation factor for age
  let depreciationFactor = depreciationRates[Math.min(age, 15)] || 0.1;

  // Adjust for car type/make
  const carTypeLower = (carType || 'sedan').toLowerCase();
  let typeModifier = carTypeModifiers.default;
  for (const [type, modifier] of Object.entries(carTypeModifiers)) {
    if (carTypeLower.includes(type)) {
      typeModifier = modifier;
      break;
    }
  }
  depreciationFactor *= typeModifier;

  // Adjust for mileage (average 12,000-15,000 miles/year)
  const avgMilesPerYear = 12000;
  const expectedMileage = age * avgMilesPerYear;
  const mileageNum = parseInt(mileage) || 0;

  if (mileageNum > expectedMileage * 1.5) {
    // Very high mileage - additional 15% penalty
    depreciationFactor *= 0.85;
  } else if (mileageNum > expectedMileage * 1.2) {
    // High mileage - 8% penalty
    depreciationFactor *= 0.92;
  } else if (mileageNum < expectedMileage * 0.5) {
    // Very low mileage - 8% bonus
    depreciationFactor *= 1.08;
  } else if (mileageNum < expectedMileage * 0.8) {
    // Low mileage - 5% bonus
    depreciationFactor *= 1.05;
  }

  // Adjust for condition
  const conditionMultipliers = {
    'excellent': 1.12,
    'very good': 1.05,
    'good': 1.0,
    'fair': 0.85,
    'poor': 0.65
  };
  depreciationFactor *= conditionMultipliers[condition?.toLowerCase()] || 1.0;

  // Ensure factor doesn't exceed 1.0 or go below 0.05
  depreciationFactor = Math.min(1.0, Math.max(0.05, depreciationFactor));

  const currentValue = originalPrice * depreciationFactor;
  const depreciation = originalPrice - currentValue;

  return {
    currentValue: Math.round(currentValue),
    originalPrice: Math.round(originalPrice),
    depreciation: Math.round(depreciation),
    depreciationPercent: Math.round((depreciation / originalPrice) * 100),
    age,
    mileage: mileageNum,
    expectedMileage,
    condition: condition || 'good',
    carType: carType || 'sedan',
    mileageStatus: mileageNum > expectedMileage * 1.2 ? 'high' : mileageNum < expectedMileage * 0.8 ? 'low' : 'average',
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
