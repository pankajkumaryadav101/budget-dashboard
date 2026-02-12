import React, { useEffect, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings_v1';

// Check if Notification API is available
const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

// Request browser notification permission
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    console.log('Browser does not support notifications');
    alert('Your browser does not support notifications');
    return false;
  }

  try {
    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      alert('Notifications are blocked. Please enable them in your browser settings.');
      return false;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    console.log('Notification permission result:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    alert('Error requesting notification permission. Please try again.');
    return false;
  }
};

// Send browser notification
export const sendNotification = (title, options = {}) => {
  if (!isNotificationSupported()) return null;

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }
  return null;
};

// Check budget thresholds and send alerts
export const checkBudgetAlerts = (budgets, spentByCategory, settings) => {
  const alerts = [];

  budgets.forEach(budget => {
    const spent = spentByCategory[budget.name] || 0;
    const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    if (percent >= 100) {
      alerts.push({
        type: 'danger',
        category: budget.name,
        message: `🚨 ${budget.name} budget exceeded! ${settings.currencySymbol}${spent.toFixed(0)} spent of ${settings.currencySymbol}${budget.amount}`,
        percent
      });
    } else if (percent >= 90) {
      alerts.push({
        type: 'warning',
        category: budget.name,
        message: `⚠️ ${budget.name} at ${percent.toFixed(0)}%! Only ${settings.currencySymbol}${(budget.amount - spent).toFixed(0)} left`,
        percent
      });
    } else if (percent >= 80) {
      alerts.push({
        type: 'info',
        category: budget.name,
        message: `📊 ${budget.name} at ${percent.toFixed(0)}% - ${settings.currencySymbol}${(budget.amount - spent).toFixed(0)} remaining`,
        percent
      });
    }
  });

  return alerts;
};

// Check upcoming bills
export const checkUpcomingBills = (recurringItems) => {
  const today = new Date();
  const alerts = [];

  recurringItems.forEach(item => {
    if (!item.active || item.paidThisMonth) return;

    const dueDay = item.dueDay || 1;
    const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 0 && daysUntil >= -5) {
      alerts.push({
        type: 'danger',
        name: item.name,
        message: `🔴 ${item.name} is overdue!`,
        daysUntil
      });
    } else if (daysUntil > 0 && daysUntil <= 3) {
      alerts.push({
        type: 'warning',
        name: item.name,
        message: `⏰ ${item.name} due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
        daysUntil
      });
    } else if (daysUntil > 3 && daysUntil <= 7) {
      alerts.push({
        type: 'info',
        name: item.name,
        message: `📅 ${item.name} due in ${daysUntil} days`,
        daysUntil
      });
    }
  });

  return alerts;
};

export default function NotificationCenter({ budgets = [], spentByCategory = {}, recurringItems = [] }) {
  const { settings } = useSettings();
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationSupported, setNotificationSupported] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    budgetAlerts: true,
    billReminders: true,
    thresholdPercent: 80
  });
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    // Load settings
    try {
      const stored = JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_KEY) || '{}');
      if (Object.keys(stored).length > 0) {
        setNotificationSettings(stored);
      }
    } catch (e) {}

    // Check if notifications are supported and permission status
    if (isNotificationSupported()) {
      setNotificationSupported(true);
      setNotificationEnabled(Notification.permission === 'granted');
    } else {
      setNotificationSupported(false);
    }
  }, []);

  useEffect(() => {
    // Generate alerts
    const budgetAlerts = notificationSettings.budgetAlerts
      ? checkBudgetAlerts(budgets, spentByCategory, settings)
      : [];
    const billAlerts = notificationSettings.billReminders
      ? checkUpcomingBills(recurringItems)
      : [];

    setAlerts([...budgetAlerts, ...billAlerts]);
  }, [budgets, spentByCategory, recurringItems, notificationSettings, settings]);

  const enableNotifications = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      setNotificationEnabled(granted);
      if (granted) {
        sendNotification('Notifications Enabled', {
          body: 'You will now receive budget and bill alerts'
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const updateSettings = (key, value) => {
    const updated = { ...notificationSettings, [key]: value };
    setNotificationSettings(updated);
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
  };

  const dismissAlert = (index) => {
    setDismissed([...dismissed, index]);
  };

  const activeAlerts = alerts.filter((_, i) => !dismissed.includes(i));

  return (
    <div>
      {/* Notification Permission */}
      <div className="mb-4 p-3 rounded border">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <strong>🔔 Browser Notifications</strong>
            <small className="text-muted d-block">Get alerts for bills and budget limits</small>
          </div>
          {!notificationSupported ? (
            <span className="badge bg-secondary">Not Supported</span>
          ) : notificationEnabled ? (
            <span className="badge bg-success">✓ Enabled</span>
          ) : (
            <button
              className="btn btn-danger btn-sm"
              onClick={enableNotifications}
              disabled={isRequesting}
            >
              {isRequesting ? '⏳ Requesting...' : 'Enable'}
            </button>
          )}
        </div>
        {!notificationSupported && (
          <small className="text-warning d-block mt-2">
            Your browser doesn't support notifications. Try Chrome, Firefox, or Edge.
          </small>
        )}
        {notificationSupported && !notificationEnabled && isNotificationSupported() && Notification.permission === 'denied' && (
          <small className="text-warning d-block mt-2">
            Notifications are blocked. Click the 🔒 icon in your browser's address bar to enable them.
          </small>
        )}
      </div>

      {/* Settings */}
      <div className="mb-4">
        <h6 className="text-muted mb-3">Alert Settings</h6>
        <div className="d-flex flex-column gap-2">
          <div className="form-check form-switch">
            <input
              type="checkbox"
              className="form-check-input"
              id="budgetAlerts"
              checked={notificationSettings.budgetAlerts}
              onChange={(e) => updateSettings('budgetAlerts', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="budgetAlerts">
              Budget threshold alerts
            </label>
          </div>
          <div className="form-check form-switch">
            <input
              type="checkbox"
              className="form-check-input"
              id="billReminders"
              checked={notificationSettings.billReminders}
              onChange={(e) => updateSettings('billReminders', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="billReminders">
              Upcoming bill reminders
            </label>
          </div>
          <div className="mt-2">
            <label className="form-label small">Alert at budget threshold (%)</label>
            <input
              type="range"
              className="form-range"
              min="50"
              max="95"
              step="5"
              value={notificationSettings.thresholdPercent}
              onChange={(e) => updateSettings('thresholdPercent', parseInt(e.target.value))}
            />
            <small className="text-muted">{notificationSettings.thresholdPercent}%</small>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div>
          <h6 className="text-muted mb-3">Active Alerts ({activeAlerts.length})</h6>
          <div className="d-flex flex-column gap-2">
            {activeAlerts.map((alert, idx) => (
              <div
                key={idx}
                className={`alert alert-${alert.type} py-2 mb-0 d-flex justify-content-between align-items-center`}
              >
                <span>{alert.message}</span>
                <button
                  className="btn-close btn-sm"
                  onClick={() => dismissAlert(alerts.indexOf(alert))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeAlerts.length === 0 && (
        <div className="text-center py-4 text-muted">
          <span style={{ fontSize: '32px' }}>✅</span>
          <p className="mt-2 mb-0">No active alerts</p>
        </div>
      )}

      {/* Test Notification Button */}
      {notificationEnabled && (
        <div className="mt-4 text-center">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => sendNotification('Test Notification', { body: 'Notifications are working!' })}
          >
            🔔 Send Test Notification
          </button>
        </div>
      )}
    </div>
  );
}
