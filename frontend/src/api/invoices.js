import { http } from "./http";

export async function listInvoices(params) {
  const res = await http.get("/invoices", { params: params ?? {} });
  return res.data.data;
}

export async function getInvoice(id) {
  const res = await http.get(`/invoices/${id}`);
  return res.data.data;
}

export async function generateInvoice(orderId, payload) {
  const res = await http.post(`/invoices/generate/${orderId}`, payload);
  return res.data.data;
}

export async function recordPayment(invoiceId, payload) {
  const res = await http.post(`/invoices/${invoiceId}/payments`, payload);
  return res.data.data;
}

export async function listPayments(invoiceId) {
  const res = await http.get(`/invoices/${invoiceId}/payments`);
  return res.data.data;
}

