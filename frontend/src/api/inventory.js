import { http } from "./http";

export async function listItems({ search, low_stock } = {}) {
  const params = {};
  if (search) params.search = search;
  if (low_stock) params.low_stock = true;
  const res = await http.get("/inventory", { params });
  return res.data.data;
}

export async function createItem(payload) {
  const res = await http.post("/inventory", payload);
  return res.data.data;
}

export async function updateItem(id, payload) {
  const res = await http.put(`/inventory/${id}`, payload);
  return res.data.data;
}

export async function deactivateItem(id) {
  const res = await http.patch(`/inventory/${id}/deactivate`);
  return res.data.data;
}

export async function adjustStock(id, payload) {
  const res = await http.patch(`/inventory/${id}/adjust-stock`, payload);
  return res.data.data;
}

