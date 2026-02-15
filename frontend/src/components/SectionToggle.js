import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function SectionToggle({ title, icon, children, defaultOpen = true }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

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
    <div className="mt-4" style={{ borderRadius: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={cardHeaderStyle} onClick={() => setOpen(o => !o)}>
        <span style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
          {icon && <span role="img" aria-label="section-icon">{icon}</span>} {title}
        </span>
        <span style={{transition:'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', fontSize:'1.2em'}}>&#9654;</span>
      </div>
      {open && (
        <div style={cardBodyStyle}>
          {children}
        </div>
      )}
    </div>
  );
}
