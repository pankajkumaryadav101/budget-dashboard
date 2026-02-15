import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeScheduler() {
  const { theme, toggleTheme, scheduleEnabled, schedule, updateSchedule, toggleSchedule } = useTheme();

  return (
    <div className="card">
      <div className="card-header" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <strong>🌓 Theme Settings</strong>
      </div>
      <div className="card-body">
        {/* Current Theme */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <strong>Current Theme</strong>
            <small className="text-muted d-block">Click to toggle manually</small>
          </div>
          <button
            className={`btn ${theme === 'dark' ? 'btn-dark' : 'btn-light border'}`}
            onClick={toggleTheme}
            style={{ minWidth: '100px' }}
          >
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>

        {/* Auto Schedule Toggle */}
        <div className="mb-4">
          <div className="form-check form-switch">
            <input
              type="checkbox"
              className="form-check-input"
              id="scheduleEnabled"
              checked={scheduleEnabled}
              onChange={(e) => toggleSchedule(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="scheduleEnabled">
              <strong>Auto-switch based on time</strong>
            </label>
          </div>
          <small className="text-muted">
            Automatically change theme at scheduled times
          </small>
        </div>

        {/* Schedule Settings */}
        {scheduleEnabled && (
          <div className="p-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
            <h6 className="mb-3">⏰ Schedule</h6>

            <div className="row g-3">
              <div className="col-6">
                <label className="form-label small">
                  ☀️ Light Mode Starts
                </label>
                <input
                  type="time"
                  className="form-control"
                  value={schedule.lightStart}
                  onChange={(e) => updateSchedule({ lightStart: e.target.value })}
                />
                <small className="text-muted">Morning time</small>
              </div>

              <div className="col-6">
                <label className="form-label small">
                  🌙 Dark Mode Starts
                </label>
                <input
                  type="time"
                  className="form-control"
                  value={schedule.darkStart}
                  onChange={(e) => updateSchedule({ darkStart: e.target.value })}
                />
                <small className="text-muted">Evening time</small>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-3 pt-3 border-top">
              <small className="text-muted d-block mb-2">Preview:</small>
              <div className="d-flex gap-2 align-items-center">
                <span className="badge bg-light text-dark">☀️ {schedule.lightStart}</span>
                <span>→</span>
                <span className="badge bg-dark">🌙 {schedule.darkStart}</span>
                <span>→</span>
                <span className="badge bg-light text-dark">☀️ {schedule.lightStart}</span>
              </div>
            </div>

            {/* Current Status */}
            <div className="mt-3 p-2 rounded border">
              <small className="text-muted">
                Current time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' • '}
                Active: {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </small>
            </div>
          </div>
        )}

        {/* Quick Presets */}
        <div className="mt-4">
          <small className="text-muted d-block mb-2">Quick Presets:</small>
          <div className="d-flex flex-wrap gap-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                updateSchedule({ lightStart: '06:00', darkStart: '18:00' });
                toggleSchedule(true);
              }}
            >
              🌅 Early Bird (6am - 6pm)
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                updateSchedule({ lightStart: '07:00', darkStart: '19:00' });
                toggleSchedule(true);
              }}
            >
              ☀️ Standard (7am - 7pm)
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                updateSchedule({ lightStart: '08:00', darkStart: '22:00' });
                toggleSchedule(true);
              }}
            >
              🦉 Night Owl (8am - 10pm)
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => toggleSchedule(false)}
            >
              🔒 Always {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
