import React from "react";
import Dashboard from "./components/Dashboard";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import Header from "./components/Header";

function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <div className="app">
          <Header />
          <main>
            <Dashboard />
          </main>
        </div>
      </ThemeProvider>
    </SettingsProvider>
  );
}

export default App;