import React from "react";
import { useTranslation } from "react-i18next";
import { useSettings, COUNTRY_CONFIGS } from "../contexts/SettingsContext";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { setCountry, updateSettings } = useSettings();
  const currentLang = i18n.language;

  const change = (lng) => {
    i18n.changeLanguage(lng);
    if (lng === 'hi') {
      // Switch to India + INR when Hindi selected
      const cfg = COUNTRY_CONFIGS.India;
      setCountry('India');
      updateSettings({ language: 'hi', country: 'India', currency: cfg.currency, currencySymbol: cfg.currencySymbol, dateFormat: cfg.dateFormat });
    } else {
      // Default back to USA + USD for English
      const cfg = COUNTRY_CONFIGS.USA;
      setCountry('USA');
      updateSettings({ language: 'en', country: 'USA', currency: cfg.currency, currencySymbol: cfg.currencySymbol, dateFormat: cfg.dateFormat });
    }
  };

  return (
    <div className="btn-group btn-group-sm" role="group">
      <button
        type="button"
        className={`btn ${currentLang === 'en' ? 'btn-danger' : 'btn-outline-secondary'}`}
        onClick={() => change("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={`btn ${currentLang === 'hi' ? 'btn-danger' : 'btn-outline-secondary'}`}
        onClick={() => change("hi")}
      >
        हिं
      </button>
    </div>
  );
}