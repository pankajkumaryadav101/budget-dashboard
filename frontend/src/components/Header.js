import React, { useState, useEffect, useRef } from "react";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useSettings, COUNTRY_CONFIGS } from "../contexts/SettingsContext";
import { syncFull, checkBackendHealth } from "../api/api";
import { downloadBackup, uploadAndRestore, autoSaveBackup, getAutoBackupInfo } from "../utils/dataBackup";
import logo from '../assets/pky-logo.png';

export default function Header() {
  const { t } = useTranslation();
  const { settings, setCountry } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('unknown'); // 'online', 'offline', 'unknown'
  const [lastSynced, setLastSynced] = useState(null);
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const fileInputRef = useRef(null);

  // Check backend health on mount and setup auto-backup
  useEffect(() => {
    checkHealth();
    // Load last sync time
    const lastSync = localStorage.getItem('last_sync_time');
    if (lastSync) {
      setLastSynced(new Date(lastSync));
    }

    // Auto-backup every 5 minutes while app is open
    const backupInterval = setInterval(() => {
      autoSaveBackup();
      console.log('Auto-backup saved');
    }, 5 * 60 * 1000);

    // Initial auto-backup
    autoSaveBackup();

    return () => clearInterval(backupInterval);
  }, []);

  const checkHealth = async () => {
    const healthy = await checkBackendHealth();
    setSyncStatus(healthy ? 'online' : 'offline');
    // Note: Auto-sync disabled to prevent duplicates until backend sync endpoints are ready
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // For now, just clean up local storage (backend sync not fully set up yet)
      cleanupLocalDuplicates();

      const result = await syncFull();
      if (result.success) {
        const now = new Date();
        localStorage.setItem('last_sync_time', now.toISOString());
        setLastSynced(now);
        setSyncStatus('online');
      } else {
        // Sync endpoint not available, but local cleanup done
        console.log('Backend sync not available, local cleanup complete');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      // Still mark as done - local data is cleaned
    } finally {
      setSyncing(false);
    }
  };

  // Clean up duplicate entries in localStorage
  const cleanupLocalDuplicates = () => {
    try {
      // Clean transactions
      const transactions = JSON.parse(localStorage.getItem('transactions_v1') || '[]');
      const uniqueTx = dedupeById(transactions);
      localStorage.setItem('transactions_v1', JSON.stringify(uniqueTx));

      // Clean assets
      const assets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
      const uniqueAssets = dedupeById(assets);
      localStorage.setItem('assets_v1', JSON.stringify(uniqueAssets));

      // Clean monthly expenses
      const expenses = JSON.parse(localStorage.getItem('monthly_expenses_v1') || '[]');
      const uniqueExp = dedupeById(expenses);
      localStorage.setItem('monthly_expenses_v1', JSON.stringify(uniqueExp));

      console.log('Cleaned duplicates:', {
        transactions: transactions.length - uniqueTx.length,
        assets: assets.length - uniqueAssets.length,
        expenses: expenses.length - uniqueExp.length
      });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  };

  const dedupeById = (items) => {
    const map = new Map();
    for (const item of items) {
      if (item.id) map.set(String(item.id), item);
    }
    return Array.from(map.values());
  };

  const getSyncStatusIcon = () => {
    if (syncing) return '🔄';
    if (syncStatus === 'online') return '🟢';
    if (syncStatus === 'offline') return '🔴';
    return '⚪';
  };

  const formatLastSynced = () => {
    if (!lastSynced) return 'Never';
    const diff = Date.now() - lastSynced.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastSynced.toLocaleTimeString();
  };

  // Handle backup download
  const handleDownloadBackup = () => {
    try {
      const filename = downloadBackup();
      setBackupMessage(`✅ Backup saved as ${filename}`);
      setTimeout(() => setBackupMessage(''), 3000);
    } catch (error) {
      setBackupMessage('❌ Backup failed: ' + error.message);
    }
    setShowBackupMenu(false);
  };

  // Handle restore from file
  const handleRestoreClick = () => {
    fileInputRef.current?.click();
    setShowBackupMenu(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadAndRestore(file);
      setBackupMessage(`✅ Restored ${result.imported} items. Reloading...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setBackupMessage('❌ Restore failed: ' + error.message);
      setTimeout(() => setBackupMessage(''), 3000);
    }

    // Reset file input
    e.target.value = '';
  };

  return (
    <nav className="navbar navbar-expand sticky-top border-bottom" style={{ background: 'var(--bg-primary)' }}>
      <div className="container-fluid">
        <span className="navbar-brand mb-0 h1 text-danger fw-bold">
          <img src={logo} alt="PKY Budget App Logo" style={{ height: 40, width: 40, borderRadius: 8, marginRight: 8 }} />
          💰 {t("title")}
        </span>
        <div className="d-flex align-items-center gap-2">
          {/* Backup Message Toast */}
          {backupMessage && (
            <span className="badge bg-dark">{backupMessage}</span>
          )}

          {/* Backup/Restore Dropdown */}
          <div className="dropdown">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setShowBackupMenu(!showBackupMenu)}
              title="Backup & Restore"
            >
              💾
            </button>
            {showBackupMenu && (
              <div className="dropdown-menu show" style={{ right: 0, left: 'auto', minWidth: '200px' }}>
                <h6 className="dropdown-header">💾 Backup & Restore</h6>
                <button className="dropdown-item" onClick={handleDownloadBackup}>
                  📥 Download Backup
                </button>
                <button className="dropdown-item" onClick={handleRestoreClick}>
                  📤 Restore from File
                </button>
                <div className="dropdown-divider"></div>
                <small className="dropdown-item-text text-muted px-3">
                  Auto-backup: every 5 min
                </small>
              </div>
            )}
          </div>

          {/* Hidden file input for restore */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            style={{ display: 'none' }}
          />

          {/* Sync Button */}
          <button
            className={`btn btn-sm ${syncStatus === 'online' ? 'btn-outline-success' : 'btn-outline-secondary'}`}
            onClick={handleSync}
            disabled={syncing}
            title={`Last synced: ${formatLastSynced()}`}
          >
            {getSyncStatusIcon()} {syncing ? 'Syncing...' : 'Sync'}
          </button>

          {/* Country/Currency Selector */}
          <div className="dropdown">
            <button
              className="btn btn-outline-secondary btn-sm dropdown-toggle"
              type="button"
              onClick={() => setShowSettings(!showSettings)}
            >
              {settings.currencySymbol} {settings.country}
            </button>
            {showSettings && (
              <div className="dropdown-menu show" style={{ right: 0, left: 'auto' }}>
                <h6 className="dropdown-header">Select Country</h6>
                {Object.entries(COUNTRY_CONFIGS).map(([code, config]) => (
                  <button
                    key={code}
                    className={`dropdown-item ${settings.country === code ? 'active' : ''}`}
                    onClick={() => {
                      setCountry(code);
                      setShowSettings(false);
                    }}
                  >
                    {config.currencySymbol} {config.name} ({config.currency})
                  </button>
                ))}
              </div>
            )}
          </div>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}