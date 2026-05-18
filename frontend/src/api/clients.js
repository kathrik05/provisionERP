import { http } from "./http";

export async function listClients(search) {
  const res = await http.get("/clients", { params: search ? { search } : {} });
  return res.data.data;
}

export async function createClient(payload) {
  const res = await http.post("/clients", payload);
  return res.data.data;
}

export async function updateClient(id, payload) {
  const res = await http.put(`/clients/${id}`, payload);
  return res.data.data;
}

export async function deactivateClient(id) {
  const res = await http.patch(`/clients/${id}/deactivate`);
  return res.data.data;
}

