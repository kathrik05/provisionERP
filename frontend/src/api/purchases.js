import { http } from "./http";

export async function listPurchases(params) {
  const res = await http.get("/purchases", { params: params ?? {} });
  return res.data.data;
}

export async function getPurchase(id) {
  const res = await http.get(`/purchases/${id}`);
  return res.data.data;
}

export async function createPurchase(data) {
  const res = await http.post("/purchases", data);
  return res.data.data;
}

export async function updatePurchase(id, data) {
  const res = await http.put(`/purchases/${id}`, data);
  return res.data.data;
}

export async function receivePurchase(id) {
  const res = await http.patch(`/purchases/${id}/receive`);
  return res.data.data;
}

export async function recordPayment(purchaseId, data) {
  const res = await http.post(`/purchases/${purchaseId}/payments`, data);
  return res.data.data;
}

export async function listPayments(purchaseId) {
  const res = await http.get(`/purchases/${purchaseId}/payments`);
  return res.data.data;
}
