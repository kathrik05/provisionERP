import { http } from "./http";

export async function getDashboard() {
  const res = await http.get("/reports/dashboard");
  return res.data.data;
}

export async function getSalesReport(params) {
  const res = await http.get("/reports/sales", { params: params ?? {} });
  return res.data.data;
}

export async function getOutstandingReport() {
  const res = await http.get("/reports/outstanding");
  return res.data.data;
}

export async function getInventoryReport() {
  const res = await http.get("/reports/inventory");
  return res.data.data;
}

export async function getPaymentsReport(params) {
  const res = await http.get("/reports/payments", { params: params ?? {} });
  return res.data.data;
}

