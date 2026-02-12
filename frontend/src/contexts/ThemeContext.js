import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

const SCHEDULE_KEY = "theme_schedule_v1";

export function ThemeProvider({ children }) {
  const stored = localStorage.getItem("theme") || "dark";
  const [theme, setTheme] = useState(stored);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [schedule, setSchedule] = useState({ lightStart: "07:00", darkStart: "19:00" });

  // Load schedule settings
  useEffect(() => {
    try {
      const savedSchedule = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || "{}");
      if (savedSchedule.enabled !== undefined) {
        setScheduleEnabled(savedSchedule.enabled);
        if (savedSchedule.lightStart) setSchedule(s => ({ ...s, lightStart: savedSchedule.lightStart }));
        if (savedSchedule.darkStart) setSchedule(s => ({ ...s, darkStart: savedSchedule.darkStart }));
      }
    } catch (e) {}
  }, []);

  // Check and apply scheduled theme
  useEffect(() => {
    if (!scheduleEnabled) return;

    const checkSchedule = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [lightH, lightM] = schedule.lightStart.split(":").map(Number);
      const [darkH, darkM] = schedule.darkStart.split(":").map(Number);
      const lightMinutes = lightH * 60 + lightM;
      const darkMinutes = darkH * 60 + darkM;

      let newTheme;
      if (lightMinutes < darkMinutes) {
        // Normal: light during day, dark at night
        newTheme = (currentMinutes >= lightMinutes && currentMinutes < darkMinutes) ? "light" : "dark";
      } else {
        // Inverted: dark during day, light at night
        newTheme = (currentMinutes >= darkMinutes && currentMinutes < lightMinutes) ? "dark" : "light";
      }

      if (newTheme !== theme) {
        setTheme(newTheme);
      }
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [scheduleEnabled, schedule, theme]);

  useEffect(() => {
    // Apply theme to both html and body for maximum compatibility
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);

    // Also add/remove class for Bootstrap compatibility
    if (theme === "dark") {
      document.body.classList.add("bg-dark");
      document.body.classList.remove("bg-light");
    } else {
      document.body.classList.add("bg-light");
      document.body.classList.remove("bg-dark");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const updateSchedule = (newSchedule) => {
    const updated = { ...schedule, ...newSchedule, enabled: scheduleEnabled };
    setSchedule({ lightStart: updated.lightStart, darkStart: updated.darkStart });
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(updated));
  };

  const toggleSchedule = (enabled) => {
    setScheduleEnabled(enabled);
    const saved = { ...schedule, enabled };
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(saved));
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      scheduleEnabled,
      schedule,
      updateSchedule,
      toggleSchedule
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}