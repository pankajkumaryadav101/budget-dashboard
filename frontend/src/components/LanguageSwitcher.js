import React from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const change = (lng) => i18n.changeLanguage(lng);
  return (
    <div className="language-switcher">
      <button onClick={() => change("en")}>EN</button>
      <button onClick={() => change("hi")}>हिं</button>
    </div>
  );
}