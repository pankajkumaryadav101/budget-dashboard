import React, { useState, useEffect } from 'react';
import { getReminders, verifyAssetLocation } from '../api/api';

export default function ReminderToast({ onViewAsset }) {
  const [reminders, setReminders] = useState([]);
  const [visible, setVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadReminders();
    const interval = setInterval(loadReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadReminders = async () => {
    try {
      const data = await getReminders();
      setReminders(data);
    } catch (err) {
      console.error('Failed to load reminders:', err);
    }
  };

  const handleDismiss = () => {
    if (currentIndex < reminders.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setVisible(false);
    }
  };

  const handleVerify = async (assetId) => {
    try {
      await verifyAssetLocation(assetId);
      loadReminders();
      handleDismiss();
    } catch (err) {
      console.error('Verify failed:', err);
    }
  };

  if (!visible || reminders.length === 0) {
    return null;
  }

  const reminder = reminders[currentIndex];
  if (!reminder) return null;

  const getBorderClass = (type) => {
    switch (type) {
      case 'CRITICAL': return 'border-danger';
      case 'WARNING': return 'border-warning';
      default: return 'border-info';
    }
  };

  return (
    <div className="position-fixed" style={{ top: '80px', right: '20px', zIndex: 1050, maxWidth: '380px' }}>
      <div className={`card border-start border-4 ${getBorderClass(reminder.type)} shadow-lg`}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <strong>Asset Needs Attention</strong>
            </div>
            <span className="badge bg-secondary">
              {currentIndex + 1} / {reminders.length}
            </span>
          </div>

          <h6 className="mb-1">{reminder.assetName}</h6>
          <small className="text-muted text-uppercase d-block mb-2">{reminder.assetType}</small>
          <p className="mb-1 text-muted">
            <span className="me-1">📍</span>
            {reminder.storageLocation}
          </p>
          <small className="text-warning d-block mb-3">
            {reminder.daysSinceVerification} days since last verification
          </small>

          <div className="d-flex gap-2">
            <button
              onClick={() => handleVerify(reminder.assetId)}
              className="btn btn-success btn-sm flex-grow-1"
            >
              ✓ I've Checked It
            </button>
            <button
              onClick={() => onViewAsset && onViewAsset(reminder.assetId)}
              className="btn btn-outline-primary btn-sm"
            >
              View
            </button>
            <button
              onClick={handleDismiss}
              className="btn btn-outline-secondary btn-sm"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
