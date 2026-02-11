import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const STORAGE_KEY = 'tax_reminders_v1';

// USA Tax Rules (2025-26)
const USA_TAX_RULES = {
  single: {
    name: 'Single Filer (2025)',
    slabs: [
      { min: 0, max: 11600, rate: 10, description: '10% on first $11,600' },
      { min: 11601, max: 47150, rate: 12, description: '12% on $11,601-$47,150' },
      { min: 47151, max: 100525, rate: 22, description: '22% on $47,151-$100,525' },
      { min: 100526, max: 191950, rate: 24, description: '24% on $100,526-$191,950' },
      { min: 191951, max: 243725, rate: 32, description: '32% on $191,951-$243,725' },
      { min: 243726, max: 609350, rate: 35, description: '35% on $243,726-$609,350' },
      { min: 609351, max: Infinity, rate: 37, description: '37% on over $609,350' },
    ],
    standardDeduction: 14600,
  },
  married: {
    name: 'Married Filing Jointly (2025)',
    slabs: [
      { min: 0, max: 23200, rate: 10, description: '10% on first $23,200' },
      { min: 23201, max: 94300, rate: 12, description: '12% on $23,201-$94,300' },
      { min: 94301, max: 201050, rate: 22, description: '22% on $94,301-$201,050' },
      { min: 201051, max: 383900, rate: 24, description: '24% on $201,051-$383,900' },
      { min: 383901, max: 487450, rate: 32, description: '32% on $383,901-$487,450' },
      { min: 487451, max: 731200, rate: 35, description: '35% on $487,451-$731,200' },
      { min: 731201, max: Infinity, rate: 37, description: '37% on over $731,200' },
    ],
    standardDeduction: 29200,
  }
};

// USA Tax Deadlines
const USA_TAX_DEADLINES = [
  { id: 'q4_estimated', name: 'Q4 Estimated Tax', date: '15-Jan', description: 'Previous year Q4 estimated payment', category: 'ESTIMATED_TAX' },
  { id: 'tax_day', name: 'Tax Day (1040)', date: '15-Apr', description: 'Federal income tax return due', category: 'TAX_FILING' },
  { id: 'q1_estimated', name: 'Q1 Estimated Tax', date: '15-Apr', description: 'First quarterly estimated payment', category: 'ESTIMATED_TAX' },
  { id: 'q2_estimated', name: 'Q2 Estimated Tax', date: '15-Jun', description: 'Second quarterly estimated payment', category: 'ESTIMATED_TAX' },
  { id: 'q3_estimated', name: 'Q3 Estimated Tax', date: '15-Sep', description: 'Third quarterly estimated payment', category: 'ESTIMATED_TAX' },
  { id: 'extension_deadline', name: 'Extension Deadline', date: '15-Oct', description: 'Extended tax return deadline', category: 'TAX_FILING' },
  { id: 'ira_contribution', name: 'IRA Contribution Deadline', date: '15-Apr', description: 'Last day for previous year IRA', category: 'INVESTMENT' },
  { id: 'hsa_contribution', name: 'HSA Contribution Deadline', date: '15-Apr', description: 'Last day for previous year HSA', category: 'INVESTMENT' },
  { id: 'w2_deadline', name: 'W-2 Forms Due', date: '31-Jan', description: 'Employers must send W-2', category: 'DOCUMENTS' },
  { id: '1099_deadline', name: '1099 Forms Due', date: '31-Jan', description: 'Various 1099 forms due', category: 'DOCUMENTS' },
];

// USA Yearly Reminders
const USA_YEARLY_REMINDERS = [
  { id: 'vehicle_insurance', name: 'Vehicle Insurance Renewal', dueMonth: null, category: 'INSURANCE' },
  { id: 'health_insurance', name: 'Health Insurance (Open Enrollment)', dueMonth: 10, category: 'INSURANCE' }, // November
  { id: 'property_tax', name: 'Property Tax', dueMonth: null, category: 'TAX' },
  { id: 'vehicle_registration', name: 'Vehicle Registration', dueMonth: null, category: 'VEHICLE' },
  { id: 'hoa_fees', name: 'HOA Fees (Annual)', dueMonth: null, category: 'HOUSING' },
  { id: '401k_contribution', name: '401(k) Max Contribution Review', dueMonth: 11, description: 'Max $23,000 for 2024', category: 'INVESTMENT' },
  { id: 'roth_ira', name: 'Roth IRA Contribution', dueMonth: 3, description: 'Before Tax Day', category: 'INVESTMENT' },
  { id: 'fsa_deadline', name: 'FSA Spending Deadline', dueMonth: 2, description: 'Use it or lose it', category: 'HEALTHCARE' },
  { id: 'license_renewal', name: 'Driver License Renewal', dueMonth: null, category: 'DOCUMENTS' },
];

// Indian Tax Calendar and Rules (FY 2025-26)
const INDIA_TAX_RULES = {
  regime: {
    new: {
      name: 'New Tax Regime (Default FY 2025-26)',
      slabs: [
        { min: 0, max: 400000, rate: 0, description: 'No tax' },
        { min: 400001, max: 800000, rate: 5, description: '5% of income above ₹4L' },
        { min: 800001, max: 1200000, rate: 10, description: '₹20,000 + 10% above ₹8L' },
        { min: 1200001, max: 1600000, rate: 15, description: '₹60,000 + 15% above ₹12L' },
        { min: 1600001, max: 2000000, rate: 20, description: '₹1,20,000 + 20% above ₹16L' },
        { min: 2000001, max: 2400000, rate: 25, description: '₹2,00,000 + 25% above ₹20L' },
        { min: 2400001, max: Infinity, rate: 30, description: '₹3,00,000 + 30% above ₹24L' },
      ],
      standardDeduction: 75000,
      rebate87A: 60000,
    },
    old: {
      name: 'Old Tax Regime',
      slabs: [
        { min: 0, max: 250000, rate: 0, description: 'No tax' },
        { min: 250001, max: 500000, rate: 5, description: '5% of income above ₹2.5L' },
        { min: 500001, max: 1000000, rate: 20, description: '₹12,500 + 20% above ₹5L' },
        { min: 1000001, max: Infinity, rate: 30, description: '₹1,12,500 + 30% above ₹10L' },
      ],
      standardDeduction: 50000,
    }
  }
};

// India Tax Deadlines
const INDIA_TAX_DEADLINES = [
  { id: 'advance_q1', name: 'Advance Tax Q1', date: '15-Jun', description: '15% of total tax liability', category: 'ADVANCE_TAX' },
  { id: 'advance_q2', name: 'Advance Tax Q2', date: '15-Sep', description: '45% cumulative', category: 'ADVANCE_TAX' },
  { id: 'advance_q3', name: 'Advance Tax Q3', date: '15-Dec', description: '75% cumulative', category: 'ADVANCE_TAX' },
  { id: 'advance_q4', name: 'Advance Tax Q4', date: '15-Mar', description: '100% of tax liability', category: 'ADVANCE_TAX' },
  { id: 'itr_filing', name: 'ITR Filing Deadline', date: '31-Jul', description: 'Non-audit taxpayers', category: 'ITR' },
  { id: 'form_16', name: 'Form 16 from Employer', date: '15-Jun', description: 'Request from employer', category: 'DOCUMENTS' },
  { id: 'belated_itr', name: 'Belated/Revised ITR', date: '31-Dec', description: 'Last date for belated return', category: 'ITR' },
];

// India Yearly Reminders
const INDIA_YEARLY_REMINDERS = [
  { id: 'vehicle_insurance', name: 'Vehicle Insurance Renewal', dueMonth: null, category: 'INSURANCE' },
  { id: 'life_insurance', name: 'Life Insurance Premium', dueMonth: null, category: 'INSURANCE' },
  { id: 'health_insurance', name: 'Health Insurance Renewal', dueMonth: null, category: 'INSURANCE' },
  { id: 'property_tax', name: 'Property Tax', dueMonth: 3, category: 'TAX' },
  { id: 'ppf', name: 'PPF Contribution', dueMonth: 2, description: 'Before Mar 31 for 80C', category: 'INVESTMENT' },
  { id: 'elss', name: 'ELSS Investment', dueMonth: 2, description: 'Tax saving mutual fund', category: 'INVESTMENT' },
];

export default function TaxReminders() {
  const { settings } = useSettings();
  const [selectedRegime, setSelectedRegime] = useState('single');
  const [annualIncome, setAnnualIncome] = useState('');
  const [taxEstimate, setTaxEstimate] = useState(null);
  const [yearlyReminders, setYearlyReminders] = useState([]);
  const [showCalculator, setShowCalculator] = useState(false);

  const isUSA = settings.country === 'USA';
  const taxDeadlines = isUSA ? USA_TAX_DEADLINES : INDIA_TAX_DEADLINES;

  useEffect(() => {
    loadReminders();
    // Reset regime when country changes
    setSelectedRegime(isUSA ? 'single' : 'new');
  }, [isUSA]);

  const loadReminders = () => {
    const defaultReminders = isUSA ? USA_YEARLY_REMINDERS : INDIA_YEARLY_REMINDERS;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY + '_' + settings.country));
      if (stored) {
        setYearlyReminders(stored);
      } else {
        setYearlyReminders(defaultReminders.map(r => ({ ...r, active: false, amount: 0, customMonth: null })));
      }
    } catch (err) {
      setYearlyReminders(defaultReminders.map(r => ({ ...r, active: false, amount: 0, customMonth: null })));
    }
  };

  const saveReminders = (updated) => {
    setYearlyReminders(updated);
    localStorage.setItem(STORAGE_KEY + '_' + settings.country, JSON.stringify(updated));
  };

  const toggleReminder = (id) => {
    const updated = yearlyReminders.map(r => r.id === id ? { ...r, active: !r.active } : r);
    saveReminders(updated);
  };

  const updateReminder = (id, field, value) => {
    const updated = yearlyReminders.map(r => r.id === id ? { ...r, [field]: value } : r);
    saveReminders(updated);
  };

  const calculateTax = () => {
    const income = parseFloat(annualIncome) || 0;

    if (isUSA) {
      // USA Tax Calculation
      const regime = USA_TAX_RULES[selectedRegime];
      const taxableIncome = Math.max(0, income - regime.standardDeduction);

      let tax = 0;
      let previousMax = 0;

      for (const slab of regime.slabs) {
        if (taxableIncome > slab.min) {
          const taxableInSlab = Math.min(taxableIncome, slab.max) - previousMax;
          tax += (taxableInSlab * slab.rate) / 100;
          previousMax = slab.max;
        }
        if (taxableIncome <= slab.max) break;
      }

      // Add Social Security (6.2%) + Medicare (1.45%) for self-employed
      const selfEmploymentTax = income * 0.0765;

      setTaxEstimate({
        grossIncome: income,
        standardDeduction: regime.standardDeduction,
        taxableIncome,
        federalTax: tax,
        selfEmploymentTax: 0, // Only for self-employed
        totalTax: tax,
        monthlyTax: tax / 12,
        effectiveRate: income > 0 ? ((tax / income) * 100).toFixed(2) : 0
      });
    } else {
      // India Tax Calculation
      const regime = INDIA_TAX_RULES.regime[selectedRegime];
      const taxableIncome = Math.max(0, income - regime.standardDeduction);

      let tax = 0;
      let previousMax = 0;

      for (const slab of regime.slabs) {
        if (taxableIncome > slab.min) {
          const taxableInSlab = Math.min(taxableIncome, slab.max) - previousMax;
          tax += (taxableInSlab * slab.rate) / 100;
          previousMax = slab.max;
        }
        if (taxableIncome <= slab.max) break;
      }

      // Apply rebate u/s 87A for new regime
      if (selectedRegime === 'new' && taxableIncome <= 1200000) {
        tax = Math.max(0, tax - regime.rebate87A);
      }

    // Add 4% Health & Education Cess
    const cess = tax * 0.04;
    const totalTax = tax + cess;

    setTaxEstimate({
      grossIncome: income,
      standardDeduction: regime.standardDeduction,
      taxableIncome,
      baseTax: tax,
      cess,
      totalTax,
      monthlyTax: totalTax / 12,
      effectiveRate: income > 0 ? ((totalTax / income) * 100).toFixed(2) : 0
    });
    }
  };

  // Get upcoming tax deadlines
  const getUpcomingDeadlines = () => {
    const today = new Date();

    return taxDeadlines.map(deadline => {
      const [day, monthStr] = deadline.date.split('-');
      const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
      const month = months[monthStr];
      const deadlineDate = new Date(today.getFullYear(), month, parseInt(day));

      // If deadline has passed this year, show next year
      if (deadlineDate < today) {
        deadlineDate.setFullYear(today.getFullYear() + 1);
      }

      const daysUntil = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

      return { ...deadline, daysUntil, deadlineDate };
    }).sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const upcomingDeadlines = getUpcomingDeadlines().slice(0, 5);

  // Get current tax slabs based on country and regime
  const getCurrentSlabs = () => {
    if (isUSA) {
      return USA_TAX_RULES[selectedRegime]?.slabs || [];
    }
    return INDIA_TAX_RULES.regime[selectedRegime]?.slabs || [];
  };

  return (
    <div>
      {/* Upcoming Tax Deadlines */}
      <h6 className="text-muted mb-3">📅 Upcoming {isUSA ? 'IRS' : 'ITR'} Deadlines</h6>
      <div className="d-flex flex-column gap-2 mb-4">
        {upcomingDeadlines.map(deadline => (
          <div
            key={deadline.id}
            className={`d-flex justify-content-between align-items-center p-2 rounded border ${
              deadline.daysUntil <= 7 ? 'border-danger bg-danger bg-opacity-10' :
              deadline.daysUntil <= 30 ? 'border-warning bg-warning bg-opacity-10' : ''
            }`}
          >
            <div>
              <span className="d-block fw-medium">{deadline.name}</span>
              <small className="text-muted">{deadline.description}</small>
            </div>
            <div className="text-end">
              <span className="d-block">{deadline.date}</span>
              <small className={deadline.daysUntil <= 7 ? 'text-danger' : deadline.daysUntil <= 30 ? 'text-warning' : 'text-muted'}>
                {deadline.daysUntil} days
              </small>
            </div>
          </div>
        ))}
      </div>

      {/* Tax Calculator */}
      <div className="border-top pt-3 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="text-muted mb-0">🧮 {isUSA ? 'IRS' : 'ITR'} Tax Calculator</h6>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setShowCalculator(!showCalculator)}
          >
            {showCalculator ? 'Hide' : 'Show'}
          </button>
        </div>

        {showCalculator && (
          <div>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label className="form-label small">Annual Income ({settings.currencySymbol})</label>
                <input
                  type="number"
                  className="form-control"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                  placeholder={isUSA ? "e.g., 75000" : "e.g., 1200000"}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">{isUSA ? 'Filing Status' : 'Tax Regime'}</label>
                <select
                  className="form-select"
                  value={selectedRegime}
                  onChange={(e) => setSelectedRegime(e.target.value)}
                >
                  {isUSA ? (
                    <>
                      <option value="single">Single Filer</option>
                      <option value="married">Married Filing Jointly</option>
                    </>
                  ) : (
                    <>
                      <option value="new">New Regime (FY 2025-26)</option>
                      <option value="old">Old Regime</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <button className="btn btn-danger w-100 mb-3" onClick={calculateTax}>
              Calculate Tax
            </button>

            {taxEstimate && (
              <div className="bg-light rounded p-3">
                <div className="row g-2 text-center">
                  <div className="col-6">
                    <small className="text-muted d-block">Taxable Income</small>
                    <strong>{settings.currencySymbol}{taxEstimate.taxableIncome.toLocaleString()}</strong>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Total Tax</small>
                    <strong className="text-danger">{settings.currencySymbol}{Math.round(taxEstimate.totalTax).toLocaleString()}</strong>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Monthly Tax</small>
                    <strong>{settings.currencySymbol}{Math.round(taxEstimate.monthlyTax).toLocaleString()}</strong>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Effective Rate</small>
                    <strong>{taxEstimate.effectiveRate}%</strong>
                  </div>
                </div>
                <hr />
                <small className="text-muted">
                  {isUSA ? (
                    <>Standard deduction of ${selectedRegime === 'single' ? '14,600' : '29,200'} applied. State taxes not included.</>
                  ) : (
                    <>
                      Includes 4% Health & Education Cess. Standard deduction of ₹{selectedRegime === 'new' ? '75,000' : '50,000'} applied.
                      {selectedRegime === 'new' && taxEstimate.taxableIncome <= 1200000 && ' Rebate u/s 87A applied.'}
                    </>
                  )}
                </small>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tax Slabs Reference */}
      <div className="border-top pt-3 mb-4">
        <h6 className="text-muted mb-3">
          📊 Tax Slabs ({isUSA
            ? (selectedRegime === 'single' ? 'Single Filer 2025' : 'Married Filing Jointly 2025')
            : (selectedRegime === 'new' ? 'New Regime FY 2025-26' : 'Old Regime')
          })
        </h6>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>Income Range</th>
                <th className="text-end">Rate</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentSlabs().map((slab, idx) => (
                <tr key={idx}>
                  <td>
                    {settings.currencySymbol}{slab.min.toLocaleString()} - {slab.max === Infinity ? 'Above' : `${settings.currencySymbol}${slab.max.toLocaleString()}`}
                  </td>
                  <td className="text-end">
                    <span className={`badge ${slab.rate === 0 ? 'bg-success' : slab.rate <= 12 ? 'bg-warning text-dark' : 'bg-danger'}`}>
                      {slab.rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yearly Reminders */}
      <div className="border-top pt-3">
        <h6 className="text-muted mb-3">📌 Yearly Financial Reminders</h6>
        <div className="d-flex flex-wrap gap-2">
          {yearlyReminders.map(reminder => (
            <button
              key={reminder.id}
              className={`btn btn-sm ${reminder.active ? 'btn-danger' : 'btn-outline-secondary'}`}
              onClick={() => toggleReminder(reminder.id)}
            >
              {reminder.active ? '✓ ' : '+ '}{reminder.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
