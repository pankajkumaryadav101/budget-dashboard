import React, { useEffect, useState } from "react";

const STORAGE_KEY = "transactions_v1";

export default function TransactionList() {
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setTxs(stored);
  }, []);

  return (
    <div>
      <ul>
        {txs.map((t) => (
          <li key={t.id}>
            {t.date} — {t.category} — {t.description} — ${t.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}