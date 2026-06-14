import { http } from "./http";

export async function getPriceHistory(itemId) {
  const res = await http.get(`/price-history/${itemId}`);
  return res.data.data;
}

export async function getSupplierPriceHistory(itemId, supplierId) {
  const res = await http.get(`/price-history/${itemId}/${supplierId}`);
  return res.data.data;
}

export async function addPriceHistory(data) {
  const res = await http.post("/price-history", data);
  return res.data.data;
}
