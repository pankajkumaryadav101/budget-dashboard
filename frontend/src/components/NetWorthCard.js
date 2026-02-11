import React from 'react';
import { useTranslation } from 'react-i18next';

export default function NetWorthCard({ netWorth, totalIncome, totalExpenses, balance }) {
  const { t } = useTranslation();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="card net-worth-card">
      <h2>{t('netWorth') || 'Net Worth'}</h2>
      <div className="net-worth-value">{formatCurrency(netWorth)}</div>

      <div className="budget-summary">
        <div className="summary-row income">
          <span>{t('income') || 'Income'}</span>
          <span className="amount positive">{formatCurrency(totalIncome)}</span>
        </div>
        <div className="summary-row expense">
          <span>{t('expenses') || 'Expenses'}</span>
          <span className="amount negative">{formatCurrency(totalExpenses)}</span>
        </div>
        <div className="summary-row balance">
          <span>{t('balance') || 'Balance'}</span>
          <span className={`amount ${balance >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(balance)}
          </span>
        </div>
      </div>

      <style jsx="true">{`
        .net-worth-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(229, 57, 53, 0.3);
        }
        .net-worth-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #e53935;
          margin: 16px 0;
          text-align: center;
        }
        .budget-summary {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-radius: 6px;
          background: rgba(255,255,255,0.03);
        }
        .amount {
          font-weight: 600;
        }
        .positive {
          color: #4caf50;
        }
        .negative {
          color: #f44336;
        }
      `}</style>
    </div>
  );
}
