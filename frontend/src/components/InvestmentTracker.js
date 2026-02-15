import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../contexts/SettingsContext';

const INVESTMENTS_KEY = 'investments_v1';

const INVESTMENT_TYPES = [
  { id: 'stock', name: 'Stock', icon: '📈' },
  { id: 'etf', name: 'ETF', icon: '📊' },
  { id: 'mutual_fund', name: 'Mutual Fund', icon: '💹' },
  { id: 'bond', name: 'Bond', icon: '📜' },
  { id: 'crypto', name: 'Cryptocurrency', icon: '₿' },
  { id: 'reit', name: 'REIT', icon: '🏢' },
  { id: 'other', name: 'Other', icon: '💰' }
];

// Mock price data (in real app, you'd fetch from API)
const getMockPrice = (symbol) => {
  // Generate consistent "random" price based on symbol
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = 50 + (hash % 200);
  const variation = (Math.sin(Date.now() / 100000 + hash) * 5).toFixed(2);
  return basePrice + parseFloat(variation);
};

export default function InvestmentTracker() {
  const { settings } = useSettings();
  const [investments, setInvestments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newInvestment, setNewInvestment] = useState({
    symbol: '',
    name: '',
    type: 'stock',
    shares: '',
    avgCost: '',
    currentPrice: '',
    purchaseDate: ''
  });
  const [marketData, setMarketData] = useState({ crypto: [], stocks: [] });
  const [loadingMarket, setLoadingMarket] = useState(false);

  useEffect(() => {
    loadInvestments();
  }, []);

  const loadInvestments = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(INVESTMENTS_KEY) || '[]');
      setInvestments(stored);
    } catch (e) {
      setInvestments([]);
    }
  };

  const saveInvestments = (invList) => {
    localStorage.setItem(INVESTMENTS_KEY, JSON.stringify(invList));
    setInvestments(invList);
  };

  const addInvestment = () => {
    if (!newInvestment.symbol || !newInvestment.shares || !newInvestment.avgCost) return;

    const investment = {
      id: Date.now().toString(),
      ...newInvestment,
      symbol: newInvestment.symbol.toUpperCase(),
      shares: parseFloat(newInvestment.shares),
      avgCost: parseFloat(newInvestment.avgCost),
      currentPrice: parseFloat(newInvestment.currentPrice) || parseFloat(newInvestment.avgCost),
      createdAt: new Date().toISOString(),
      priceHistory: [{
        date: new Date().toISOString().split('T')[0],
        price: parseFloat(newInvestment.currentPrice) || parseFloat(newInvestment.avgCost)
      }]
    };

    saveInvestments([investment, ...investments]);
    setNewInvestment({
      symbol: '',
      name: '',
      type: 'stock',
      shares: '',
      avgCost: '',
      currentPrice: '',
      purchaseDate: ''
    });
    setShowAddForm(false);
  };

  const deleteInvestment = (id) => {
    if (!window.confirm('Delete this investment?')) return;
    saveInvestments(investments.filter(i => i.id !== id));
  };

  const updatePrices = () => {
    setRefreshing(true);

    // Simulate fetching prices
    setTimeout(() => {
      const updated = investments.map(inv => {
        const newPrice = getMockPrice(inv.symbol);
        const history = inv.priceHistory || [];
        const today = new Date().toISOString().split('T')[0];

        // Add to history if not already recorded today
        if (!history.find(h => h.date === today)) {
          history.push({ date: today, price: newPrice });
        }

        return {
          ...inv,
          currentPrice: newPrice,
          priceHistory: history.slice(-30) // Keep last 30 days
        };
      });

      saveInvestments(updated);
      setRefreshing(false);
    }, 1000);
  };

  const fetchMarketData = async () => {
    setLoadingMarket(true);
    try {
      // Fetch top cryptocurrencies
      const cryptoRes = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1');
      // Fetch top stocks using Alpha Vantage (free demo API)
      const topStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'BABA', 'ORCL'];
      const stockPromises = topStocks.map(symbol =>
        axios.get(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=demo`)
      );
      const stockResults = await Promise.all(stockPromises);
      const stocks = stockResults.map((res, i) => {
        const quote = res.data['Global Quote'] || {};
        return {
          symbol: topStocks[i],
          price: parseFloat(quote['05. price']) || 0,
          change: parseFloat(quote['09. change']) || 0
        };
      });
      setMarketData({ crypto: cryptoRes.data, stocks });
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoadingMarket(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  const getInvestmentType = (typeId) => {
    return INVESTMENT_TYPES.find(t => t.id === typeId) || INVESTMENT_TYPES[INVESTMENT_TYPES.length - 1];
  };

  const calculateGainLoss = (inv) => {
    const totalCost = inv.shares * inv.avgCost;
    const currentValue = inv.shares * inv.currentPrice;
    const gainLoss = currentValue - totalCost;
    const percent = totalCost > 0 ? (gainLoss / totalCost * 100) : 0;
    return { gainLoss, percent, currentValue, totalCost };
  };

  // Portfolio summary
  const portfolioSummary = investments.reduce((acc, inv) => {
    const { gainLoss, currentValue, totalCost } = calculateGainLoss(inv);
    acc.totalValue += currentValue;
    acc.totalCost += totalCost;
    acc.totalGainLoss += gainLoss;
    return acc;
  }, { totalValue: 0, totalCost: 0, totalGainLoss: 0 });

  portfolioSummary.percent = portfolioSummary.totalCost > 0
    ? (portfolioSummary.totalGainLoss / portfolioSummary.totalCost * 100)
    : 0;

  // Group by type
  const byType = investments.reduce((acc, inv) => {
    const type = inv.type || 'other';
    if (!acc[type]) acc[type] = { count: 0, value: 0 };
    acc[type].count++;
    acc[type].value += calculateGainLoss(inv).currentValue;
    return acc;
  }, {});

  return (
    <div>
      {/* Portfolio Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="p-3 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
            <small className="text-muted d-block">Portfolio Value</small>
            <h4 className="text-danger mb-0">{settings.currencySymbol}{portfolioSummary.totalValue.toLocaleString()}</h4>
          </div>
        </div>
        <div className="col-md-3">
          <div className="p-3 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
            <small className="text-muted d-block">Total Cost</small>
            <h4 className="mb-0">{settings.currencySymbol}{portfolioSummary.totalCost.toLocaleString()}</h4>
          </div>
        </div>
        <div className="col-md-3">
          <div className="p-3 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
            <small className="text-muted d-block">Total Gain/Loss</small>
            <h4 className={`mb-0 ${portfolioSummary.totalGainLoss >= 0 ? 'text-success' : 'text-danger'}`}>
              {portfolioSummary.totalGainLoss >= 0 ? '+' : ''}{settings.currencySymbol}{portfolioSummary.totalGainLoss.toFixed(2)}
            </h4>
          </div>
        </div>
        <div className="col-md-3">
          <div className="p-3 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
            <small className="text-muted d-block">Return %</small>
            <h4 className={`mb-0 ${portfolioSummary.percent >= 0 ? 'text-success' : 'text-danger'}`}>
              {portfolioSummary.percent >= 0 ? '+' : ''}{portfolioSummary.percent.toFixed(2)}%
            </h4>
          </div>
        </div>
      </div>

      {/* Type Breakdown */}
      {Object.keys(byType).length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-4">
          {Object.entries(byType).map(([type, data]) => {
            const typeInfo = getInvestmentType(type);
            const percent = portfolioSummary.totalValue > 0 ? (data.value / portfolioSummary.totalValue * 100) : 0;
            return (
              <div key={type} className="px-3 py-2 rounded border" style={{ background: 'var(--bg-secondary)' }}>
                <span className="me-1">{typeInfo.icon}</span>
                <strong>{data.count}</strong>
                <span className="text-muted ms-1">{typeInfo.name}</span>
                <span className="badge bg-danger ms-2">{percent.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button
          className={`btn ${showAddForm ? 'btn-outline-secondary' : 'btn-danger'}`}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Investment'}
        </button>
        <button
          className="btn btn-outline-danger"
          onClick={updatePrices}
          disabled={refreshing || investments.length === 0}
        >
          {refreshing ? '⏳ Refreshing...' : '🔄 Update Prices'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card mb-4">
          <div className="card-body">
            <h6 className="mb-3">📈 Add Investment</h6>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label small">Symbol/Ticker *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., AAPL"
                  value={newInvestment.symbol}
                  onChange={(e) => setNewInvestment({ ...newInvestment, symbol: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="col-md-5">
                <label className="form-label small">Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Apple Inc."
                  value={newInvestment.name}
                  onChange={(e) => setNewInvestment({ ...newInvestment, name: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Type</label>
                <select
                  className="form-select"
                  value={newInvestment.type}
                  onChange={(e) => setNewInvestment({ ...newInvestment, type: e.target.value })}
                >
                  {INVESTMENT_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small">Shares/Units *</label>
                <input
                  type="number"
                  className="form-control"
                  step="0.001"
                  value={newInvestment.shares}
                  onChange={(e) => setNewInvestment({ ...newInvestment, shares: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small">Avg Cost/Share *</label>
                <div className="input-group">
                  <span className="input-group-text">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    className="form-control"
                    step="0.01"
                    value={newInvestment.avgCost}
                    onChange={(e) => setNewInvestment({ ...newInvestment, avgCost: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label small">Current Price</label>
                <div className="input-group">
                  <span className="input-group-text">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    className="form-control"
                    step="0.01"
                    placeholder="Optional"
                    value={newInvestment.currentPrice}
                    onChange={(e) => setNewInvestment({ ...newInvestment, currentPrice: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label small">Purchase Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newInvestment.purchaseDate}
                  onChange={(e) => setNewInvestment({ ...newInvestment, purchaseDate: e.target.value })}
                />
              </div>
              <div className="col-12">
                <button className="btn btn-danger" onClick={addInvestment}>✓ Add to Portfolio</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investment List */}
      {investments.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <span style={{ fontSize: '64px' }}>📈</span>
          <h5 className="mt-3">No Investments Yet</h5>
          <p>Track your stocks, ETFs, mutual funds, and crypto</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th className="text-end">Shares</th>
                <th className="text-end">Avg Cost</th>
                <th className="text-end">Current</th>
                <th className="text-end">Value</th>
                <th className="text-end">Gain/Loss</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {investments.map(inv => {
                const typeInfo = getInvestmentType(inv.type);
                const { gainLoss, percent, currentValue } = calculateGainLoss(inv);

                return (
                  <tr key={inv.id}>
                    <td>
                      <span className="me-1">{typeInfo.icon}</span>
                      <strong>{inv.symbol}</strong>
                    </td>
                    <td className="text-muted">{inv.name || '-'}</td>
                    <td className="text-end">{inv.shares.toLocaleString()}</td>
                    <td className="text-end">{settings.currencySymbol}{inv.avgCost.toFixed(2)}</td>
                    <td className="text-end">{settings.currencySymbol}{inv.currentPrice.toFixed(2)}</td>
                    <td className="text-end fw-bold">{settings.currencySymbol}{currentValue.toLocaleString()}</td>
                    <td className={`text-end fw-bold ${gainLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                      {gainLoss >= 0 ? '+' : ''}{settings.currencySymbol}{gainLoss.toFixed(2)}
                      <small className="d-block">({percent >= 0 ? '+' : ''}{percent.toFixed(1)}%)</small>
                    </td>
                    <td>
                      <button
                        className="btn btn-link btn-sm text-danger p-0"
                        onClick={() => deleteInvestment(inv.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-secondary">
                <td colSpan="5"><strong>Total Portfolio</strong></td>
                <td className="text-end fw-bold">{settings.currencySymbol}{portfolioSummary.totalValue.toLocaleString()}</td>
                <td className={`text-end fw-bold ${portfolioSummary.totalGainLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                  {portfolioSummary.totalGainLoss >= 0 ? '+' : ''}{settings.currencySymbol}{portfolioSummary.totalGainLoss.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Market Overview */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">🌍 Market Overview</h5>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={fetchMarketData}
            disabled={loadingMarket}
          >
            {loadingMarket ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>
        <div className="row">
          <div className="col-md-6">
            <h6>Top Cryptocurrencies</h6>
            {loadingMarket ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-danger" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Price</th>
                      <th>24h %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketData.crypto.map(coin => (
                      <tr key={coin.id}>
                        <td>{coin.name} ({coin.symbol.toUpperCase()})</td>
                        <td>${coin.current_price.toFixed(2)}</td>
                        <td><span style={{ color: coin.price_change_percentage_24h > 0 ? '#00ff00' : coin.price_change_percentage_24h < 0 ? '#ff0000' : 'var(--text-primary) !important' }}>{coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="col-md-6">
            <h6>Top Stocks</h6>
            {loadingMarket ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-danger" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Price</th>
                      <th>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketData.stocks.map(stock => (
                      <tr key={stock.symbol}>
                        <td>{stock.symbol}</td>
                        <td>${stock.price.toFixed(2)}</td>
                        <td><span style={{ color: stock.change > 0 ? '#00ff00' : stock.change < 0 ? '#ff0000' : 'var(--text-primary) !important' }}>{stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>


      <small className="text-muted d-block mt-3">
        💡 Note: Cryptocurrency data from CoinGecko (free API). Stock data from Alpha Vantage (demo API with limits).
      </small>
    </div>
  );
}
