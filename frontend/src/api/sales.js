import { http } from "./http";

export async function listSalesOrders({ search, status, client_id }) {
  const params = {};
  if (search) params.search = search;
  if (status && status !== "all") params.status = status;
  if (client_id) params.client_id = client_id;
  const res = await http.get("/sales", { params });
  return res.data.data;
}

export async function getSalesOrder(id) {
  const res = await http.get(`/sales/${id}`);
  return res.data.data;
}

export async function createSalesOrder(payload) {
  const res = await http.post("/sales", payload);
  return res.data.data;
}

export async function updateSalesOrder(id, payload) {
  const res = await http.put(`/sales/${id}`, payload);
  return res.data.data;
}

export async function confirmSalesOrder(id) {
  const res = await http.patch(`/sales/${id}/confirm`);
  return res.data.data;
}

export async function updateExtraCharge(id, payload) {
  const res = await http.put(`/sales/${id}/extra-charge`, payload);
  return res.data.data;
}

export async function overrideLineTax({ orderId, itemId, tax_id }) {
  const res = await http.patch(`/sales/${orderId}/items/${itemId}/tax`, { tax_id });
  return res.data.data;
}
