import React from "react";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

export default function Header() {
  const { t } = useTranslation();
  return (
    <header className="app-header">
      <h1>{t("title")}</h1>
      <div className="header-controls">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}