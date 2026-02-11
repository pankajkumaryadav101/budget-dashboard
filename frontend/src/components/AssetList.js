import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { getAllAssets, searchAssets, verifyAssetLocation, deleteAsset } from '../api/api';
import { getGoldPrice, getCarValue, getRealEstateValue, calculateGoldValue, getLandPrice, clearMarketPriceCache } from '../api/marketPriceService';

// Asset type configurations
const ASSET_CONFIGS = {
  GOLD: { icon: '🥇', color: '#FFD700', appreciates: true },
  LAND: { icon: '🏞️', color: '#8B4513', appreciates: true },
  REAL_ESTATE: { icon: '🏠', color: '#4CAF50', appreciates: true },
  CAR: { icon: '🚗', color: '#2196F3', appreciates: false },
  JEWELRY: { icon: '💎', color: '#E91E63', appreciates: true },
  ELECTRONICS: { icon: '📱', color: '#9C27B0', appreciates: false },
  DOCUMENTS: { icon: '📄', color: '#607D8B', appreciates: false },
  CASH: { icon: '💵', color: '#4CAF50', appreciates: false },
  STOCKS: { icon: '📈', color: '#00BCD4', appreciates: true },
  CRYPTO: { icon: '₿', color: '#F7931A', appreciates: true },
  OTHER: { icon: '📦', color: '#9E9E9E', appreciates: false }
};

export default function AssetList({ onEdit, refreshTrigger }) {
  const { t } = useTranslation();
  const { settings, convertCurrency } = useSettings();
  const [assets, setAssets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid');
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [marketPrices, setMarketPrices] = useState({});
  const [totalValue, setTotalValue] = useState(0);

  const assetTypes = ['ALL', ...Object.keys(ASSET_CONFIGS)];

  useEffect(() => {
    loadAssets();
  }, [refreshTrigger, settings.currency]); // Reload when currency changes

  useEffect(() => {
    calculateTotalValue();
  }, [assets, marketPrices, settings.currency]);

  // Helper to convert asset value to current currency
  const getConvertedAssetValue = (asset) => {
    let value = parseFloat(asset.currentMarketPrice || asset.purchasePrice) || 0;
    const assetCurrency = asset.currency || 'USD';
    if (assetCurrency !== settings.currency) {
      value = convertCurrency(value, assetCurrency, settings.currency);
    }
    return value;
  };

  const loadAssets = async () => {
    setLoading(true);
    try {
      // Load from localStorage (primary source for now)
      const localAssets = JSON.parse(localStorage.getItem('assets_v1') || '[]');

      // Deduplicate by ID
      const uniqueAssets = deduplicateAssets(localAssets);

      // If we removed duplicates, save the cleaned list back
      if (uniqueAssets.length !== localAssets.length) {
        localStorage.setItem('assets_v1', JSON.stringify(uniqueAssets));
      }

      setAssets(uniqueAssets);
      await fetchMarketPrices(uniqueAssets);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to remove duplicate assets by ID
  const deduplicateAssets = (assetList) => {
    const seen = new Map();
    for (const asset of assetList) {
      const id = asset.id?.toString();
      if (id && !seen.has(id)) {
        seen.set(id, asset);
      } else if (!id) {
        // Asset without ID - generate one
        asset.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        seen.set(asset.id, asset);
      }
    }
    return Array.from(seen.values());
  };

  const fetchMarketPrices = async (assetList) => {
    setUpdatingPrices(true);
    const prices = {};

    try {
      const goldPrice = await getGoldPrice(settings.currency);
      prices.gold = goldPrice;

      for (const asset of assetList) {
        if (asset.type === 'GOLD' && asset.quantity) {
          const goldValue = await calculateGoldValue(asset.quantity, settings.currency, asset.purity || 24);
          prices[`asset_${asset.id}`] = goldValue;
        } else if (asset.type === 'CAR' && asset.purchasePrice && asset.purchaseYear) {
          // Pass car name as car type for better depreciation calculation
          const carType = asset.name || asset.description || 'sedan';
          const carValue = getCarValue(
            asset.purchasePrice,
            asset.purchaseYear,
            asset.mileage || 0,
            asset.condition || 'good',
            carType
          );
          prices[`car_${asset.id}`] = carValue;
        } else if (asset.type === 'REAL_ESTATE' && asset.purchasePrice && asset.purchaseYear) {
          const reValue = await getRealEstateValue(asset.purchasePrice, asset.purchaseYear, asset.storageLocation, settings.currency);
          prices[`re_${asset.id}`] = reValue;
        }
      }
    } catch (err) {
      console.error('Error fetching market prices:', err);
    }

    setMarketPrices(prices);
    setUpdatingPrices(false);
  };

  const calculateTotalValue = () => {
    let total = 0;
    assets.forEach(asset => {
      const calculatedValue = getCalculatedValue(asset);
      let assetValue = calculatedValue || asset.currentMarketPrice || asset.purchasePrice || 0;

      // Convert to current display currency if needed
      const assetCurrency = asset.currency || 'USD';
      if (assetCurrency !== settings.currency) {
        assetValue = convertCurrency(assetValue, assetCurrency, settings.currency);
      }

      total += assetValue;
    });
    setTotalValue(total);
  };

  const getCalculatedValue = (asset) => {
    if (asset.type === 'GOLD') {
      return marketPrices[`asset_${asset.id}`]?.value || null;
    } else if (asset.type === 'CAR') {
      return marketPrices[`car_${asset.id}`]?.currentValue || null;
    } else if (asset.type === 'REAL_ESTATE') {
      return marketPrices[`re_${asset.id}`]?.currentValue || null;
    }
    return null;
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length > 2) {
      try {
        const results = await searchAssets(query);
        setAssets(results);
      } catch (err) {
        const localAssets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
        const filtered = localAssets.filter(a =>
          a.name?.toLowerCase().includes(query.toLowerCase()) ||
          a.storageLocation?.toLowerCase().includes(query.toLowerCase())
        );
        setAssets(filtered);
      }
    } else if (query.length === 0) {
      loadAssets();
    }
  };

  const handleVerify = async (id) => {
    try {
      await verifyAssetLocation(id);
      loadAssets();
    } catch (err) {
      const localAssets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
      const updated = localAssets.map(a => a.id === id ? { ...a, lastVerifiedDate: new Date().toISOString() } : a);
      localStorage.setItem('assets_v1', JSON.stringify(updated));
      setAssets(updated);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    console.log('Deleting asset with ID:', id);

    // Delete from API (optional, won't fail if backend is down)
    await deleteAsset(id);

    // Delete from localStorage
    const localAssets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
    const idStr = String(id);
    console.log('Current assets:', localAssets.length, 'Looking for ID:', idStr);

    const updated = localAssets.filter(a => String(a.id) !== idStr);
    console.log('After filter:', updated.length);

    localStorage.setItem('assets_v1', JSON.stringify(updated));

    // Update state with deduplicated list
    setAssets(deduplicateAssets(updated));
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '—';
    return `${settings.currencySymbol}${Number(amount).toLocaleString()}`;
  };

  const getDaysSinceVerification = (lastVerified) => {
    if (!lastVerified) return 999;
    const last = new Date(lastVerified);
    const now = new Date();
    return Math.floor((now - last) / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (asset) => {
    const days = getDaysSinceVerification(asset.lastVerifiedDate);
    if (days > 90) return <span className="badge bg-danger">⚠️ Verify Now</span>;
    if (days > 60) return <span className="badge bg-warning text-dark">📅 Stale</span>;
    if (days > 30) return <span className="badge bg-info">🔔 Check Soon</span>;
    return <span className="badge bg-success">✓ Verified</span>;
  };

  const getValueChange = (asset) => {
    if (asset.type === 'CAR') {
      const carData = marketPrices[`car_${asset.id}`];
      if (carData) return { change: -carData.depreciation, percent: -carData.depreciationPercent, isPositive: false };
    } else if (asset.type === 'REAL_ESTATE') {
      const reData = marketPrices[`re_${asset.id}`];
      if (reData) return { change: reData.appreciation, percent: reData.appreciationPercent, isPositive: true };
    }
    return null;
  };

  const filteredAssets = filterType === 'ALL' ? assets : assets.filter(a => a.type === filterType);

  const assetsByType = {};
  assets.forEach(asset => {
    if (!assetsByType[asset.type]) assetsByType[asset.type] = { count: 0, value: 0 };
    assetsByType[asset.type].count++;
    assetsByType[asset.type].value += getCalculatedValue(asset) || asset.currentMarketPrice || 0;
  });

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading your assets...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="p-3 rounded border text-center h-100 d-flex flex-column justify-content-center" style={{ background: 'var(--bg-secondary)', minHeight: '100px' }}>
            <small className="text-muted d-block">Total Portfolio Value</small>
            <h3 className="text-danger mb-0">{formatCurrency(totalValue)}</h3>
            {updatingPrices && <small className="text-muted">Updating...</small>}
          </div>
        </div>
        <div className="col-md-4">
          <div className="p-3 rounded border text-center h-100 d-flex flex-column justify-content-center" style={{ background: 'var(--bg-secondary)', minHeight: '100px' }}>
            <small className="text-muted d-block">Total Assets</small>
            <h3 className="mb-0">{assets.length}</h3>
            <small className="text-muted">{Object.keys(assetsByType).length} categories</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="p-3 rounded border text-center h-100 d-flex flex-column justify-content-center" style={{ background: 'var(--bg-secondary)', minHeight: '100px' }}>
            <small className="text-muted d-block">Gold Rate (24K)</small>
            <h3 className="mb-0" style={{ color: '#FFD700' }}>
              {marketPrices.gold ? formatCurrency(marketPrices.gold.pricePerGram) : '—'}
            </h3>
            <small className="text-muted">per gram • Spot price</small>
          </div>
        </div>
      </div>

      {/* Asset Type Summary */}
      {Object.keys(assetsByType).length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-4">
          {Object.entries(assetsByType).map(([type, data]) => (
            <div
              key={type}
              className={`px-3 py-2 rounded border ${filterType === type ? 'border-danger' : ''}`}
              style={{ cursor: 'pointer', background: filterType === type ? 'rgba(229, 57, 53, 0.1)' : 'var(--bg-secondary)' }}
              onClick={() => setFilterType(filterType === type ? 'ALL' : type)}
            >
              <span className="me-1">{ASSET_CONFIGS[type]?.icon || '📦'}</span>
              <strong>{data.count}</strong>
              <span className="text-muted ms-1">{type.replace('_', ' ')}</span>
              <span className="ms-2 text-success">{formatCurrency(data.value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search and Controls */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text">🔍</span>
            <input type="text" className="form-control" placeholder="Search by name, location..." value={searchQuery} onChange={handleSearch} />
          </div>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {assetTypes.map(type => (
              <option key={type} value={type}>
                {type === 'ALL' ? '📋 All Types' : `${ASSET_CONFIGS[type]?.icon || ''} ${type.replace('_', ' ')}`}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <div className="btn-group w-100">
            <button className={`btn ${viewMode === 'grid' ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setViewMode('grid')}>▦ Grid</button>
            <button className={`btn ${viewMode === 'list' ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setViewMode('list')}>☰ List</button>
          </div>
        </div>
      </div>

      {/* Assets Display */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-4">
          <span style={{ fontSize: '64px' }}>💎</span>
          <h4 className="mt-3">{searchQuery ? 'No Assets Found' : 'Start Tracking Your Valuables'}</h4>
          <p className="text-muted mb-4">
            {searchQuery ? 'Try a different search term' : 'Keep track of where your valuable items are stored and their current value'}
          </p>

          {/* Sample Assets Guide */}
          {!searchQuery && (
            <div className="card text-start mx-auto" style={{ maxWidth: '600px' }}>
              <div className="card-header bg-danger text-white">
                <strong>📝 Examples: What You Can Track</strong>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {/* Gold Example */}
                  <div className="col-md-6">
                    <div className="p-2 rounded border d-flex align-items-start gap-2">
                      <span style={{ fontSize: '24px' }}>🥇</span>
                      <div>
                        <strong className="d-block">Gold Jewelry</strong>
                        <small className="text-muted d-block">• 50g Gold Chain</small>
                        <small className="text-muted d-block">• Location: Bank Locker</small>
                        <small className="text-muted d-block">• Auto-calculates value based on gold rate</small>
                      </div>
                    </div>
                  </div>

                  {/* Real Estate Example */}
                  <div className="col-md-6">
                    <div className="p-2 rounded border d-flex align-items-start gap-2">
                      <span style={{ fontSize: '24px' }}>🏠</span>
                      <div>
                        <strong className="d-block">House / Apartment</strong>
                        <small className="text-muted d-block">• 2BHK in Downtown</small>
                        <small className="text-muted d-block">• Purchase: $250,000</small>
                        <small className="text-muted d-block">• Tracks appreciation over time</small>
                      </div>
                    </div>
                  </div>

                  {/* Car Example */}
                  <div className="col-md-6">
                    <div className="p-2 rounded border d-flex align-items-start gap-2">
                      <span style={{ fontSize: '24px' }}>🚗</span>
                      <div>
                        <strong className="d-block">Vehicle</strong>
                        <small className="text-muted d-block">• 2022 Honda Accord</small>
                        <small className="text-muted d-block">• Mileage: 25,000 miles</small>
                        <small className="text-muted d-block">• Calculates depreciation</small>
                      </div>
                    </div>
                  </div>

                  {/* Land Example */}
                  <div className="col-md-6">
                    <div className="p-2 rounded border d-flex align-items-start gap-2">
                      <span style={{ fontSize: '24px' }}>🏞️</span>
                      <div>
                        <strong className="d-block">Land / Plot</strong>
                        <small className="text-muted d-block">• 1 acre farm land</small>
                        <small className="text-muted d-block">• Location: Texas</small>
                        <small className="text-muted d-block">• Document: Drawer #3</small>
                      </div>
                    </div>
                  </div>

                  {/* Documents Example */}
                  <div className="col-md-6">
                    <div className="p-2 rounded border d-flex align-items-start gap-2">
                      <span style={{ fontSize: '24px' }}>📄</span>
                      <div>
                        <strong className="d-block">Important Documents</strong>
                        <small className="text-muted d-block">• Passport, Birth Certificate</small>
                        <small className="text-muted d-block">• Location: Safe Box</small>
                        <small className="text-muted d-block">• Never forget where they are!</small>
                      </div>
                    </div>
                  </div>

                  {/* Jewelry Example */}
                  <div className="col-md-6">
                    <div className="p-2 rounded border d-flex align-items-start gap-2">
                      <span style={{ fontSize: '24px' }}>💎</span>
                      <div>
                        <strong className="d-block">Jewelry & Valuables</strong>
                        <small className="text-muted d-block">• Diamond Ring, Watches</small>
                        <small className="text-muted d-block">• Location: Bedroom Safe</small>
                        <small className="text-muted d-block">• Track insurance value</small>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="my-3" />

                <div className="bg-light p-3 rounded">
                  <h6 className="mb-2">💡 Pro Tips</h6>
                  <ul className="mb-0 small text-muted">
                    <li><strong>Location matters:</strong> Add specific locations like "Master Bedroom → Closet → Top Shelf"</li>
                    <li><strong>Verify regularly:</strong> The app reminds you to check if items are still there</li>
                    <li><strong>Gold auto-updates:</strong> Enter weight in grams, price updates daily</li>
                    <li><strong>Cars depreciate:</strong> Enter purchase year & mileage for accurate value</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="row g-3">
          {filteredAssets.map(asset => {
            const config = ASSET_CONFIGS[asset.type] || ASSET_CONFIGS.OTHER;
            const calculatedValue = getCalculatedValue(asset);
            const displayValue = calculatedValue || asset.currentMarketPrice;
            const valueChange = getValueChange(asset);
            const days = getDaysSinceVerification(asset.lastVerifiedDate);

            return (
              <div key={asset.id} className="col-md-6 col-lg-4">
                <div className="card h-100" style={{ borderLeft: `4px solid ${config.color}`, background: days > 60 ? 'rgba(255, 193, 7, 0.05)' : undefined }}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: '24px' }}>{config.icon}</span>
                        <span className="badge" style={{ background: config.color, color: '#fff', fontSize: '10px' }}>{asset.type?.replace('_', ' ')}</span>
                      </div>
                      {getStatusBadge(asset)}
                    </div>

                    <h5 className="card-title mb-1">{asset.name}</h5>
                    <p className="text-muted mb-2 small">📍 {asset.storageLocation || 'Location not set'}</p>

                    <div className="mb-2">
                      <div className="d-flex align-items-baseline gap-2">
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: config.color }}>{formatCurrency(displayValue)}</span>
                        {calculatedValue && <span className="badge bg-info">Live</span>}
                      </div>

                      {asset.type === 'GOLD' && asset.quantity && (
                        <small className="text-muted">{asset.quantity}g × {formatCurrency(marketPrices.gold?.pricePerGram)}/g</small>
                      )}

                      {asset.type === 'CAR' && marketPrices[`car_${asset.id}`] && (
                        <div className="small">
                          <div className="text-muted">
                            {asset.purchaseYear} • {(asset.mileage || 0).toLocaleString()} mi • {asset.condition || 'Good'}
                          </div>
                          <div className="text-danger">
                            ↓ {formatCurrency(marketPrices[`car_${asset.id}`].depreciation)} ({marketPrices[`car_${asset.id}`].depreciationPercent}% depreciated)
                          </div>
                          <div className={`small ${marketPrices[`car_${asset.id}`].mileageStatus === 'low' ? 'text-success' : marketPrices[`car_${asset.id}`].mileageStatus === 'high' ? 'text-warning' : 'text-muted'}`}>
                            {marketPrices[`car_${asset.id}`].mileageStatus === 'low' ? '✓ Low mileage' :
                             marketPrices[`car_${asset.id}`].mileageStatus === 'high' ? '⚠ High mileage' :
                             '• Average mileage'}
                          </div>
                        </div>
                      )}

                      {valueChange && asset.type !== 'CAR' && (
                        <div className={`small ${valueChange.isPositive ? 'text-success' : 'text-danger'}`}>
                          {valueChange.isPositive ? '↑' : '↓'} {formatCurrency(Math.abs(valueChange.change))} ({valueChange.percent}%)
                        </div>
                      )}
                    </div>

                    <small className="text-muted d-block mb-3">
                      {days === 0 ? 'Verified today' : days === 1 ? 'Verified yesterday' : days > 365 ? 'Never verified' : `Verified ${days} days ago`}
                    </small>

                    <div className="d-flex gap-2">
                      <button onClick={() => handleVerify(asset.id)} className="btn btn-success btn-sm flex-grow-1">✓ I Found It</button>
                      <button onClick={() => onEdit && onEdit(asset)} className="btn btn-outline-secondary btn-sm">✏️</button>
                      <button onClick={() => handleDelete(asset.id)} className="btn btn-outline-danger btn-sm">🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr><th>Type</th><th>Name</th><th>Location</th><th className="text-end">Value</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredAssets.map(asset => {
                const config = ASSET_CONFIGS[asset.type] || ASSET_CONFIGS.OTHER;
                const displayValue = getCalculatedValue(asset) || asset.currentMarketPrice;
                return (
                  <tr key={asset.id}>
                    <td><span className="me-1">{config.icon}</span>{asset.type?.replace('_', ' ')}</td>
                    <td><strong>{asset.name}</strong></td>
                    <td className="text-muted">{asset.storageLocation || '—'}</td>
                    <td className="text-end"><strong style={{ color: config.color }}>{formatCurrency(displayValue)}</strong></td>
                    <td>{getStatusBadge(asset)}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button onClick={() => handleVerify(asset.id)} className="btn btn-success">✓</button>
                        <button onClick={() => onEdit && onEdit(asset)} className="btn btn-outline-secondary">✏️</button>
                        <button onClick={() => handleDelete(asset.id)} className="btn btn-outline-danger">×</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td colSpan="3"><strong>Total</strong></td><td className="text-end"><strong className="text-danger">{formatCurrency(totalValue)}</strong></td><td colSpan="2"></td></tr></tfoot>
          </table>
        </div>
      )}

      <div className="text-center mt-4">
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => {
            clearMarketPriceCache(); // Clear cache first
            fetchMarketPrices(assets);
          }}
          disabled={updatingPrices}
        >
          {updatingPrices ? '⏳ Updating...' : '🔄 Refresh Market Prices'}
        </button>
        <small className="text-muted d-block mt-1">Gold rate: $165/gram (24K) • Click to refresh</small>
      </div>
    </div>
  );
}
