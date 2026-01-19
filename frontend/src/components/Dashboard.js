import React from "react";
import BudgetList from "./BudgetList";
import TransactionList from "./TransactionList";
import AddTransaction from "./AddTransaction";
import CurrencyRatesTable from "./CurrencyRatesTable";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation();
  return (
    <div className="dashboard">
      <div className="left-panel">
        <section className="card">
          <h2>{t("budgets")}</h2>
          <BudgetList />
        </section>

        <section className="card">
          <h2>{t("transactions")}</h2>
          <TransactionList />
          <AddTransaction />
        </section>
      </div>

      <aside className="right-panel">
        <section className="card">
          <h2>{t("currencyRates")}</h2>
          <CurrencyRatesTable />
        </section>
      </aside>
    </div>
  );
}