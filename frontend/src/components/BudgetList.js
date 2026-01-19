import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "budgets_v1";

export default function BudgetList() {
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setBudgets(stored);
  }, []);

  const addDummy = () => {
    const newBud = { id: uuidv4(), name: "Groceries", amount: 500, spent: 120 };
    const next = [...budgets, newBud];
    setBudgets(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <div>
      <button onClick={addDummy}>Add Sample Budget</button>
      <ul>
        {budgets.map((b) => (
          <li key={b.id}>
            {b.name}: ${b.spent}/{b.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}