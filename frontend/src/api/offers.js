import { http } from "./http";

export async function analyseClient(clientId) {
  const res = await http.get(`/offers/clients/${clientId}/analyse`);
  return res.data.data;
}

export async function listClientOffers(clientId) {
  const res = await http.get(`/offers/clients/${clientId}`);
  return res.data.data;
}

export async function updateOfferStatus(offerId, status) {
  const res = await http.put(`/offers/${offerId}/status`, { status });
  return res.data.data;
}

export async function listActiveOffers() {
  const res = await http.get("/offers/active");
  return res.data.data;
}

export async function simulateOffer(payload) {
  const res = await http.post("/offers/simulate", payload);
  return res.data.data;
}
