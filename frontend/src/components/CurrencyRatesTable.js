import React, { useEffect, useMemo, useState } from "react";
import { getRates, getSymbols, convert } from "../api/api";
import { useTranslation } from "react-i18next";

export default function CurrencyRatesTable({ compact = false }) {
  const { t } = useTranslation();
  const [base, setBase] = useState("USD");
  const [rates, setRates] = useState({});
  const [symbols, setSymbols] = useState({});
  const [filter, setFilter] = useState("");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const [amount, setAmount] = useState(1);
  const [converted, setConverted] = useState(null);
  const [sortField, setSortField] = useState('code');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    async function load() {
      try {
        const s = await getSymbols();
        setSymbols(s);
      } catch (e) {
        setSymbols({});
      }
      try {
        const r = await getRates(base);
        setRates(r);
      } catch (e) {
        setRates({});
      }
    }
    load();
    const id = setInterval(load, 60 * 1000);
    return () => clearInterval(id);
  }, [base]);

  const rows = useMemo(() => {
    const priorityCurrencies = ['INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
    const entries = Object.entries(rates);

    const filtered = compact
      ? entries.filter(([code]) => priorityCurrencies.includes(code)).slice(0, 5)
      : entries.filter(([code]) => code.toLowerCase().includes(filter.toLowerCase())).slice(0, 10);

    const sorted = filtered.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'rate') return (a[1] - b[1]) * dir;
      if (sortField === 'name') return (symbols[a[0]] || '').localeCompare(symbols[b[0]] || '') * dir;
      return a[0].localeCompare(b[0]) * dir; // code
    });

    return sorted;
  }, [rates, filter, compact, sortField, sortDir, symbols]);

  const doConvert = async () => {
    try {
      const res = await convert(from, to, amount);
      setConverted(res.result);
    } catch (e) {
      setConverted("error");
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? '▲' : '▼';
  };

  // Compact view for overview
  if (compact) {
    return (
      <div>
        <div className="d-flex flex-column gap-2">
          {rows.map(([code, rate]) => (
            <div key={code} className="d-flex justify-content-between align-items-center">
              <span>
                <span className="badge bg-secondary me-2">{code}</span>
                <small className="text-muted">{symbols[code]?.substring(0, 15) || ''}</small>
              </span>
              <strong>{Number(rate).toFixed(2)}</strong>
            </div>
          ))}
        </div>
        <small className="text-muted d-block mt-2">Base: {base}</small>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Base Currency */}
      <div className="row g-2 mb-3">
        <div className="col-8">
          <input
            type="text"
            className="form-control form-control-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search: USD, EUR, INR..."
          />
        </div>
        <div className="col-4">
          <select
            className="form-select form-select-sm"
            value={base}
            onChange={(e) => setBase(e.target.value)}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="INR">INR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
          </select>
        </div>
      </div>

      {/* Rates Table */}
      <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
        <table className="table table-sm table-hover mb-0">
          <thead className="sticky-top">
            <tr>
              <th role="button" onClick={() => handleSort('code')}>Code {renderSortIcon('code')}</th>
              <th role="button" onClick={() => handleSort('name')}>Name {renderSortIcon('name')}</th>
              <th className="text-end" role="button" onClick={() => handleSort('rate')}>Rate {renderSortIcon('rate')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([code, rate]) => (
              <tr key={code}>
                <td><span className="badge bg-secondary">{code}</span></td>
                <td className="text-truncate" style={{ maxWidth: '100px' }}>{symbols[code] || "-"}</td>
                <td className="text-end fw-bold">{Number(rate).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Currency Converter */}
      <div className="mt-3 pt-3 border-top">
        <small className="text-muted d-block mb-2">Quick Convert</small>
        <div className="row g-2">
          <div className="col-3">
            <input
              type="text"
              className="form-control form-control-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value.toUpperCase())}
              placeholder="From"
            />
          </div>
          <div className="col-3">
            <input
              type="text"
              className="form-control form-control-sm"
              value={to}
              onChange={(e) => setTo(e.target.value.toUpperCase())}
              placeholder="To"
            />
          </div>
          <div className="col-3">
            <input
              type="number"
              className="form-control form-control-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
            />
          </div>
          <div className="col-3">
            <button onClick={doConvert} className="btn btn-danger btn-sm w-100">
              Convert
            </button>
          </div>
        </div>
        {converted !== null && (
          <div className="alert alert-success py-2 mt-2 mb-0">
            <strong>Result:</strong> {typeof converted === 'number' ? converted.toFixed(2) : converted}
          </div>
        )}
      </div>
    </div>
  );
}