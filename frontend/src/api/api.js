import axios from "axios";

// If REACT_APP_BACKEND_URL is explicitly set to empty string, use relative paths so CRA proxy can forward to backend.
const envUrl = process.env.REACT_APP_BACKEND_URL;
const BACKEND_URL = (typeof envUrl !== 'undefined' && envUrl !== '') ? envUrl : '';

const url = (path) => (BACKEND_URL ? `${BACKEND_URL}${path}` : path);

export async function getSymbols() {
  const res = await axios.get(url('/api/symbols'));
  return res.data;
}

export async function getRates(base = "USD") {
  const res = await axios.get(url('/api/rates'), { params: { base } });
  return res.data;
}

export async function convert(from, to, amount) {
  const res = await axios.get(url('/api/convert'), { params: { from, to, amount } });
  return res.data;
}

export async function addExpense(expenseData) {
  const res = await axios.post(url('/api/expenses'), expenseData);
  return res.data;
}

export async function getMonthlyData() {
  const res = await axios.get(url('/api/monthly-data'));
  return res.data;
}

export async function getForecast() {
  const res = await axios.get(url('/api/forecast'));
  return res.data;
}

// ========== DASHBOARD API ==========
export async function getDashboardSummary() {
  const res = await axios.get(url('/api/dashboard/summary'));
  return res.data;
}

// ========== ASSET API ==========
export async function getAllAssets() {
  const res = await axios.get(url('/api/assets'));
  return res.data;
}

export async function getAssetById(id) {
  const res = await axios.get(url(`/api/assets/${id}`));
  return res.data;
}

export async function createAsset(asset) {
  const res = await axios.post(url('/api/assets'), asset);
  return res.data;
}

export async function updateAsset(id, asset) {
  const res = await axios.put(url(`/api/assets/${id}`), asset);
  return res.data;
}

export async function deleteAsset(id) {
  await axios.delete(url(`/api/assets/${id}`));
}

export async function searchAssets(query) {
  const res = await axios.get(url('/api/assets/search'), { params: { query } });
  return res.data;
}

export async function verifyAssetLocation(id) {
  const res = await axios.post(url(`/api/assets/${id}/verify`));
  return res.data;
}

export async function updateAssetPrice(id, price) {
  const res = await axios.patch(url(`/api/assets/${id}/price`), { price });
  return res.data;
}

export async function getStaleAssets() {
  const res = await axios.get(url('/api/assets/stale'));
  return res.data;
}

export async function getNetWorth() {
  const res = await axios.get(url('/api/assets/net-worth'));
  return res.data;
}

// ========== BUDGET API ==========
export async function getAllBudgetItems() {
  const res = await axios.get(url('/api/budget'));
  return res.data;
}

export async function createBudgetItem(item) {
  const res = await axios.post(url('/api/budget'), item);
  return res.data;
}

export async function updateBudgetItem(id, item) {
  const res = await axios.put(url(`/api/budget/${id}`), item);
  return res.data;
}

export async function deleteBudgetItem(id) {
  await axios.delete(url(`/api/budget/${id}`));
}

export async function getBudgetSummary() {
  const res = await axios.get(url('/api/budget/summary'));
  return res.data;
}

export async function getMonthlyBudget(year, month) {
  const res = await axios.get(url('/api/budget/monthly'), { params: { year, month } });
  return res.data;
}

export async function getExpenseCategoryBreakdown() {
  const res = await axios.get(url('/api/budget/categories/expenses'));
  return res.data;
}

// ========== NOTIFICATIONS API ==========
export async function getReminders() {
  const res = await axios.get(url('/api/notifications/reminders'));
  return res.data;
}

export async function getReminderCount() {
  const res = await axios.get(url('/api/notifications/count'));
  return res.data;
}

// ========== BACKUP API ==========
export async function exportDatabase() {
  const res = await axios.post(url('/api/backup/export'));
  return res.data;
}

export async function importDatabase(jsonContent) {
  const res = await axios.post(url('/api/backup/import'), jsonContent, {
    headers: { 'Content-Type': 'application/json' }
  });
  return res.data;
}

export async function listBackups() {
  const res = await axios.get(url('/api/backup/list'));
  return res.data;
}

