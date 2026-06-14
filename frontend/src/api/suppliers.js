import { http } from "./http";

export async function listSuppliers(params) {
  const res = await http.get("/suppliers", { params: params ?? {} });
  return res.data.data;
}

export async function getSupplier(id) {
  const res = await http.get(`/suppliers/${id}`);
  return res.data.data;
}

export async function createSupplier(data) {
  const res = await http.post("/suppliers", data);
  return res.data.data;
}

export async function updateSupplier(id, data) {
  const res = await http.put(`/suppliers/${id}`, data);
  return res.data.data;
}

export async function deactivateSupplier(id) {
  const res = await http.patch(`/suppliers/${id}/deactivate`);
  return res.data.data;
}
