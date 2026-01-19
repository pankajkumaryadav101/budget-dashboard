import React from "react";
import Dashboard from "./components/Dashboard";
import { ThemeProvider } from "./contexts/ThemeContext";
import Header from "./components/Header";

function App() {
  return (
    <ThemeProvider>
      <div className="app">
        <Header />
        <main>
          <Dashboard />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;