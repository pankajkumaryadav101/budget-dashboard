import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "react-i18next";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  return (
    <button className="theme-toggle" onClick={toggleTheme}>
      {t("theme")}: {theme}
    </button>
  );
}