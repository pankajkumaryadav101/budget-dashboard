import React, { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useSettings, COUNTRY_CONFIGS } from "../contexts/SettingsContext";

export default function Header() {
  const { t } = useTranslation();
  const { settings, setCountry } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <nav className="navbar navbar-expand sticky-top border-bottom" style={{ background: 'var(--bg-primary)' }}>
      <div className="container-fluid">
        <span className="navbar-brand mb-0 h1 text-danger fw-bold">
          💰 {t("title")}
        </span>
        <div className="d-flex align-items-center gap-3">
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