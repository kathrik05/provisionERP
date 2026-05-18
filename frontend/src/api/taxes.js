import { http } from "./http";

export async function listTaxRules({ active_only } = {}) {
  const res = await http.get("/taxes", {
    params: active_only ? { active_only: true } : {},
  });
  return res.data.data;
}

export async function createTaxRule(payload) {
  const res = await http.post("/taxes", payload);
  return res.data.data;
}

export async function updateTaxRule(id, payload) {
  const res = await http.put(`/taxes/${id}`, payload);
  return res.data.data;
}

export async function setDefaultTaxRule(id) {
  const res = await http.patch(`/taxes/${id}/set-default`);
  return res.data.data;
}

export async function deactivateTaxRule(id) {
  const res = await http.patch(`/taxes/${id}/deactivate`);
  return res.data.data;
}

