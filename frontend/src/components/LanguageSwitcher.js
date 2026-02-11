import React from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const change = (lng) => i18n.changeLanguage(lng);

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