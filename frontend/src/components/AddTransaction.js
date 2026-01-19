import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "transactions_v1";

export default function AddTransaction() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const tx = {
      id: uuidv4(),
      date: new Date().toLocaleDateString(),
      amount: parseFloat(amount),
      category,
      description
    };
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const next = [tx, ...stored];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAmount("");
    setCategory("");
    setDescription("");
    window.location.reload();
  };

  return (
    <form onSubmit={submit} className="add-tx-form">
      <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
      <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <button type="submit">Add</button>
    </form>
  );
}