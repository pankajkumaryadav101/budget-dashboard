import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

export async function getSymbols() {
  const res = await axios.get(`${BACKEND_URL}/api/symbols`);
  return res.data;
}

export async function getRates(base = "USD") {
  const res = await axios.get(`${BACKEND_URL}/api/rates`, { params: { base } });
  return res.data;
}

export async function convert(from, to, amount) {
  const res = await axios.get(`${BACKEND_URL}/api/convert`, { params: { from, to, amount } });
  return res.data;
}