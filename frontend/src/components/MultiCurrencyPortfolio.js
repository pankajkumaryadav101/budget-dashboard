import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const ASSETS_KEY = 'assets_v1';
const EXCHANGE_HISTORY_KEY = 'exchange_rate_history_v1';

export default function MultiCurrencyPortfolio() {
  const { settings, convertCurrency } = useSettings();
  const [assets, setAssets] = useState([]);
  const [groupedByCurrency, setGroupedByCurrency] = useState({});
  const [exchangeHistory, setExchangeHistory] = useState([]);
  const [totalInDisplayCurrency, setTotalInDisplayCurrency] = useState(0);

  useEffect(() => {
    loadAssets();
    loadExchangeHistory();
  }, [settings.currency]);

  const loadAssets = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(ASSETS_KEY) || '[]');
      setAssets(stored);
      groupAssets(stored);
    } catch (e) {
      setAssets([]);
    }
  };

  const loadExchangeHistory = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(EXCHANGE_HISTORY_KEY) || '[]');
      setExchangeHistory(stored);
    } catch (e) {
      setExchangeHistory([]);
    }
  };

  const saveExchangeRate = () => {
    // Save current exchange rates snapshot
    const snapshot = {
      date: new Date().toISOString().split('T')[0],
      baseCurrency: settings.currency,
      rates: {
        USD: settings.currency === 'USD' ? 1 : convertCurrency(1, 'USD', settings.currency),
        EUR: settings.currency === 'EUR' ? 1 : convertCurrency(1, 'EUR', settings.currency),
        GBP: settings.currency === 'GBP' ? 1 : convertCurrency(1, 'GBP', settings.currency),
        INR: settings.currency === 'INR' ? 1 : convertCurrency(1, 'INR', settings.currency),
        JPY: settings.currency === 'JPY' ? 1 : convertCurrency(1, 'JPY', settings.currency),
      }
    };

    // Keep last 30 days
    const updated = [...exchangeHistory.filter(h => h.date !== snapshot.date), snapshot]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 30);

    localStorage.setItem(EXCHANGE_HISTORY_KEY, JSON.stringify(updated));
    setExchangeHistory(updated);
  };

  const groupAssets = (assetList) => {
    const grouped = {};
    let total = 0;

    assetList.forEach(asset => {
      const currency = asset.currency || 'USD';
      const value = parseFloat(asset.currentMarketPrice || asset.purchasePrice) || 0;

      if (!grouped[currency]) {
        grouped[currency] = {
          currency,
          assets: [],
          totalOriginal: 0,
          totalConverted: 0
        };
      }

      grouped[currency].assets.push(asset);
      grouped[currency].totalOriginal += value;

      // Convert to display currency
      const convertedValue = currency === settings.currency
        ? value
        : convertCurrency(value, currency, settings.currency);
      grouped[currency].totalConverted += convertedValue;
      total += convertedValue;
    });

    setGroupedByCurrency(grouped);
    setTotalInDisplayCurrency(total);
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥' };
    return symbols[currency] || currency;
  };

  const getCurrencyFlag = (currency) => {
    const flags = { USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', INR: '🇮🇳', JPY: '🇯🇵', AUD: '🇦🇺', CAD: '🇨🇦' };
    return flags[currency] || '💱';
  };

  return (
    <div>
      {/* Total Portfolio Value */}
      <div className="card mb-4">
        <div className="card-body text-center">
          <small className="text-muted d-block">Total Portfolio Value</small>
          <h2 className="text-danger mb-1">
            {settings.currencySymbol}{totalInDisplayCurrency.toLocaleString()}
          </h2>
          <small className="text-muted">in {settings.currency}</small>
        </div>
      </div>

      {/* Currency Breakdown */}
      <h6 className="text-muted mb-3">💱 Assets by Currency</h6>

      {Object.keys(groupedByCurrency).length === 0 ? (
        <div className="text-center py-4 text-muted">
          <span style={{ fontSize: '48px' }}>💰</span>
          <p className="mt-2">No assets with currency data</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {Object.entries(groupedByCurrency)
            .sort((a, b) => b[1].totalConverted - a[1].totalConverted)
            .map(([currency, data]) => {
              const percent = totalInDisplayCurrency > 0
                ? (data.totalConverted / totalInDisplayCurrency * 100).toFixed(1)
                : 0;

              return (
                <div key={currency} className="card">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: '24px' }}>{getCurrencyFlag(currency)}</span>
                        <div>
                          <strong>{currency}</strong>
                          <small className="text-muted d-block">{data.assets.length} asset(s)</small>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold">
                          {getCurrencySymbol(currency)}{data.totalOriginal.toLocaleString()}
                        </div>
                        {currency !== settings.currency && (
                          <small className="text-muted">
                            ≈ {settings.currencySymbol}{data.totalConverted.toLocaleString()}
                          </small>
                        )}
                      </div>
                    </div>

                    {/* Progress bar showing portfolio percentage */}
                    <div className="progress" style={{ height: '8px' }}>
                      <div
                        className="progress-bar bg-danger"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <small className="text-muted">{percent}% of portfolio</small>

                    {/* Asset list */}
                    <div className="mt-3">
                      {data.assets.slice(0, 3).map((asset, idx) => (
                        <div key={idx} className="d-flex justify-content-between small py-1 border-bottom">
                          <span>{asset.name}</span>
                          <span>{getCurrencySymbol(currency)}{(parseFloat(asset.currentMarketPrice || asset.purchasePrice) || 0).toLocaleString()}</span>
                        </div>
                      ))}
                      {data.assets.length > 3 && (
                        <small className="text-muted">+{data.assets.length - 3} more</small>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Exchange Rate History */}
      <div className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="text-muted mb-0">📈 Exchange Rate History</h6>
          <button className="btn btn-outline-danger btn-sm" onClick={saveExchangeRate}>
            📸 Save Today's Rate
          </button>
        </div>

        {exchangeHistory.length === 0 ? (
          <div className="text-center py-3 text-muted">
            <p className="small mb-0">No rate history. Click "Save Today's Rate" to start tracking.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>USD</th>
                  <th>EUR</th>
                  <th>GBP</th>
                  <th>INR</th>
                </tr>
              </thead>
              <tbody>
                {exchangeHistory.slice(0, 7).map((record, idx) => (
                  <tr key={idx}>
                    <td>{record.date}</td>
                    <td>{record.rates?.USD?.toFixed(2) || '-'}</td>
                    <td>{record.rates?.EUR?.toFixed(2) || '-'}</td>
                    <td>{record.rates?.GBP?.toFixed(2) || '-'}</td>
                    <td>{record.rates?.INR?.toFixed(2) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
