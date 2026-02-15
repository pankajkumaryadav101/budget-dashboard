import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import SectionToggle from './SectionToggle';

export default function BudgetRecommendations() {
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    axios.get('/api/budget/analysis')
      .then(res => {
        setAnalysis(res.data.analysis || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load recommendations');
        setLoading(false);
      });
  }, [open]);

  // Theme-based styles
  const cardHeaderStyle = {
    background: theme === 'dark' ? 'var(--accent-color)' : 'var(--danger-color)',
    color: 'var(--text-primary)',
    borderBottom: theme === 'dark' ? '1px solid var(--border-color)' : '1px solid #f44336',
    padding: '0.75rem 1.25rem',
    fontWeight: 600,
    letterSpacing: '0.5px',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderTopLeftRadius: '0.5rem',
    borderTopRightRadius: '0.5rem',
    cursor: 'pointer',
    userSelect: 'none',
    justifyContent: 'space-between',
  };
  const cardBodyStyle = {
    background: theme === 'dark' ? 'var(--bg-card)' : 'var(--bg-primary)',
    color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-secondary)',
    borderBottomLeftRadius: '0.5rem',
    borderBottomRightRadius: '0.5rem',
    padding: '1.25rem',
  };

  return (
    <SectionToggle title="Smart Budget Recommendations" icon="💡" defaultOpen={true}>
      {loading ? (
        <div className="alert alert-info">Loading recommendations...</div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : analysis.length === 0 ? (
        <div className="text-muted">No recommendations at this time.</div>
      ) : (
        <ul className="list-group list-group-flush" style={{ background: 'transparent' }}>
          {analysis.map((item, idx) => (
            <li
              key={idx}
              className={`list-group-item border-0 px-0 py-2 ${item.status === 'over' ? 'text-danger' : item.status === 'under' ? 'text-warning' : item.status === 'ok' ? 'text-success' : ''}`}
              style={{ background: 'transparent', fontWeight: 500 }}
            >
              <span className="fw-bold" style={{ textTransform: 'capitalize' }}>{item.category.replace('_', ' ').toLowerCase()}:</span> {item.message}
            </li>
          ))}
        </ul>
      )}
    </SectionToggle>
  );
}
