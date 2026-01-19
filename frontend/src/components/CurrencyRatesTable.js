import React, { useEffect, useMemo, useState } from "react";
import { getRates, getSymbols, convert } from "../api/api";
import { useTranslation } from "react-i18next";

export default function CurrencyRatesTable() {
  const { t } = useTranslation();
  const [base, setBase] = useState("USD");
  const [rates, setRates] = useState({});
  const [symbols, setSymbols] = useState({});
  const [filter, setFilter] = useState("");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [amount, setAmount] = useState(1);
  const [converted, setConverted] = useState(null);

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
    return Object.entries(rates)
      .filter(([code]) => code.toLowerCase().includes(filter.toLowerCase()))
      .slice(0, 500);
  }, [rates, filter]);

  const doConvert = async () => {
    try {
      const res = await convert(from, to, amount);
      setConverted(res.result);
    } catch (e) {
      setConverted("error");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <label>{t("search")}: </label>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="USD, EUR, INR..." />
        <label style={{ marginLeft: 8 }}>Base:</label>
        <select value={base} onChange={(e) => setBase(e.target.value)}>
          <option value={base}>{base}</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="INR">INR</option>
          <option value="JPY">JPY</option>
        </select>
      </div>

      <table className="rates-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Rate (base {base})</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([code, rate]) => (
            <tr key={code}>
              <td>{code}</td>
              <td>{symbols[code] || "-"}</td>
              <td>{rate}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12 }} className="convert">
        <div>
          <label>{t("from")}:</label>
          <input value={from} onChange={(e) => setFrom(e.target.value.toUpperCase())} />
          <label>{t("to")}:</label>
          <input value={to} onChange={(e) => setTo(e.target.value.toUpperCase())} />
          <label>{t("amount")}:</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button onClick={doConvert}>{t("convert")}</button>
        </div>
        <div>
          {converted !== null && <div>Result: {converted}</div>}
        </div>
      </div>
    </div>
  );
}