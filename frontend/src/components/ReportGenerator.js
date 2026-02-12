import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const TRANSACTIONS_KEY = 'transactions_v1';
const BUDGETS_KEY = 'budgets_v1';
const ASSETS_KEY = 'assets_v1';

export default function ReportGenerator() {
  const { settings } = useSettings();
  const [reportType, setReportType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);

  const generateReport = () => {
    setGenerating(true);

    try {
      const transactions = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
      const budgets = JSON.parse(localStorage.getItem(BUDGETS_KEY) || '[]');
      const assets = JSON.parse(localStorage.getItem(ASSETS_KEY) || '[]');

      let filteredTx = [];
      let periodLabel = '';

      if (reportType === 'monthly') {
        const [year, month] = selectedMonth.split('-').map(Number);
        periodLabel = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        filteredTx = transactions.filter(tx => {
          const d = new Date(tx.date || tx.createdAt);
          return d.getMonth() === month - 1 && d.getFullYear() === year;
        });
      } else {
        const year = parseInt(selectedYear);
        periodLabel = `Year ${year}`;

        filteredTx = transactions.filter(tx => {
          const d = new Date(tx.date || tx.createdAt);
          return d.getFullYear() === year;
        });
      }

      // Calculate totals
      const totalExpenses = filteredTx.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);

      // Group by category
      const byCategory = {};
      filteredTx.forEach(tx => {
        const cat = tx.category || 'Other';
        byCategory[cat] = (byCategory[cat] || 0) + (parseFloat(tx.amount) || 0);
      });

      // Sort categories by amount
      const sortedCategories = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({ name, amount, percent: totalExpenses > 0 ? (amount / totalExpenses * 100).toFixed(1) : 0 }));

      // Monthly breakdown for yearly reports
      const monthlyBreakdown = [];
      if (reportType === 'yearly') {
        for (let m = 0; m < 12; m++) {
          const monthTx = filteredTx.filter(tx => {
            const d = new Date(tx.date || tx.createdAt);
            return d.getMonth() === m;
          });
          const total = monthTx.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
          monthlyBreakdown.push({
            month: new Date(2024, m).toLocaleDateString('en-US', { month: 'short' }),
            total,
            count: monthTx.length
          });
        }
      }

      // Asset summary
      const assetTotal = assets.reduce((sum, a) => sum + (parseFloat(a.currentMarketPrice || a.purchasePrice) || 0), 0);

      setReportData({
        period: periodLabel,
        type: reportType,
        generatedAt: new Date().toLocaleString(),
        summary: {
          totalTransactions: filteredTx.length,
          totalExpenses,
          avgTransaction: filteredTx.length > 0 ? totalExpenses / filteredTx.length : 0,
          topCategory: sortedCategories[0]?.name || 'N/A',
          budgetCategories: budgets.length,
          totalAssets: assetTotal
        },
        categories: sortedCategories,
        monthlyBreakdown,
        transactions: filteredTx.slice(0, 50) // Latest 50 for preview
      });

    } catch (err) {
      console.error('Report generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;

    // Generate printable HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Report - ${reportData.period}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          h1 { color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 10px; }
          h2 { color: #666; margin-top: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
          .summary-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
          .summary-box .label { font-size: 12px; color: #666; }
          .summary-box .value { font-size: 24px; font-weight: bold; color: #dc3545; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #dc3545; color: white; }
          tr:nth-child(even) { background: #f8f9fa; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .progress-bar { background: #e9ecef; border-radius: 4px; height: 20px; overflow: hidden; }
          .progress-fill { background: #dc3545; height: 100%; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>📊 Financial Report</h1>
        <p><strong>Period:</strong> ${reportData.period} | <strong>Generated:</strong> ${reportData.generatedAt}</p>

        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="summary-box">
            <div class="label">Total Expenses</div>
            <div class="value">${settings.currencySymbol}${reportData.summary.totalExpenses.toLocaleString()}</div>
          </div>
          <div class="summary-box">
            <div class="label">Transactions</div>
            <div class="value">${reportData.summary.totalTransactions}</div>
          </div>
          <div class="summary-box">
            <div class="label">Avg Transaction</div>
            <div class="value">${settings.currencySymbol}${reportData.summary.avgTransaction.toFixed(2)}</div>
          </div>
          <div class="summary-box">
            <div class="label">Top Category</div>
            <div class="value" style="font-size: 18px;">${reportData.summary.topCategory}</div>
          </div>
          <div class="summary-box">
            <div class="label">Budget Categories</div>
            <div class="value">${reportData.summary.budgetCategories}</div>
          </div>
          <div class="summary-box">
            <div class="label">Total Assets</div>
            <div class="value">${settings.currencySymbol}${reportData.summary.totalAssets.toLocaleString()}</div>
          </div>
        </div>

        <h2>Spending by Category</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>% of Total</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.categories.map(cat => `
              <tr>
                <td>${cat.name}</td>
                <td>${settings.currencySymbol}${cat.amount.toLocaleString()}</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${cat.percent}%"></div>
                  </div>
                  ${cat.percent}%
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${reportData.type === 'yearly' && reportData.monthlyBreakdown.length > 0 ? `
          <h2>Monthly Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Expenses</th>
                <th>Transactions</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.monthlyBreakdown.map(m => `
                <tr>
                  <td>${m.month}</td>
                  <td>${settings.currencySymbol}${m.total.toLocaleString()}</td>
                  <td>${m.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <h2>Recent Transactions</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.transactions.slice(0, 20).map(tx => `
              <tr>
                <td>${tx.date || 'N/A'}</td>
                <td>${tx.category || 'Other'}</td>
                <td>${tx.description || '-'}</td>
                <td>${settings.currencySymbol}${(parseFloat(tx.amount) || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Generated by Budget Dashboard | All data stored locally on your device</p>
        </div>
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div>
      <h6 className="text-muted mb-3">📄 Generate Financial Report</h6>

      {/* Report Options */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <label className="form-label small">Report Type</label>
          <select
            className="form-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="monthly">Monthly Report</option>
            <option value="yearly">Yearly Report</option>
          </select>
        </div>

        {reportType === 'monthly' ? (
          <div className="col-md-4">
            <label className="form-label small">Select Month</label>
            <input
              type="month"
              className="form-control"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        ) : (
          <div className="col-md-4">
            <label className="form-label small">Select Year</label>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        <div className="col-md-4 d-flex align-items-end">
          <button
            className="btn btn-danger w-100"
            onClick={generateReport}
            disabled={generating}
          >
            {generating ? '⏳ Generating...' : '📊 Generate Report'}
          </button>
        </div>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className="card">
          <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center">
            <strong>📄 {reportData.period} Report</strong>
            <button className="btn btn-light btn-sm" onClick={exportToPDF}>
              📥 Export PDF
            </button>
          </div>
          <div className="card-body">
            {/* Summary Cards */}
            <div className="row g-3 mb-4">
              <div className="col-4">
                <div className="p-3 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
                  <small className="text-muted d-block">Total Expenses</small>
                  <strong className="text-danger fs-5">{settings.currencySymbol}{reportData.summary.totalExpenses.toLocaleString()}</strong>
                </div>
              </div>
              <div className="col-4">
                <div className="p-3 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
                  <small className="text-muted d-block">Transactions</small>
                  <strong className="fs-5">{reportData.summary.totalTransactions}</strong>
                </div>
              </div>
              <div className="col-4">
                <div className="p-3 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
                  <small className="text-muted d-block">Avg Transaction</small>
                  <strong className="fs-5">{settings.currencySymbol}{reportData.summary.avgTransaction.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <h6 className="mb-3">Spending by Category</h6>
            <div className="d-flex flex-column gap-2 mb-4">
              {reportData.categories.slice(0, 5).map((cat, idx) => (
                <div key={idx} className="d-flex justify-content-between align-items-center p-2 rounded border">
                  <span>{cat.name}</span>
                  <div>
                    <span className="fw-bold text-danger me-2">{settings.currencySymbol}{cat.amount.toLocaleString()}</span>
                    <span className="badge bg-secondary">{cat.percent}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly Breakdown for Yearly */}
            {reportData.type === 'yearly' && reportData.monthlyBreakdown.length > 0 && (
              <>
                <h6 className="mb-3">Monthly Trend</h6>
                <div className="d-flex gap-1 mb-4" style={{ height: '100px', alignItems: 'flex-end' }}>
                  {reportData.monthlyBreakdown.map((m, idx) => {
                    const maxTotal = Math.max(...reportData.monthlyBreakdown.map(x => x.total));
                    const height = maxTotal > 0 ? (m.total / maxTotal * 100) : 0;
                    return (
                      <div key={idx} className="flex-grow-1 text-center">
                        <div
                          className="bg-danger mx-auto rounded-top"
                          style={{ height: `${height}%`, minHeight: m.total > 0 ? '5px' : '0', maxWidth: '30px' }}
                          title={`${settings.currencySymbol}${m.total.toLocaleString()}`}
                        />
                        <small className="text-muted d-block mt-1" style={{ fontSize: '10px' }}>{m.month}</small>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <small className="text-muted">Generated: {reportData.generatedAt}</small>
          </div>
        </div>
      )}
    </div>
  );
}
