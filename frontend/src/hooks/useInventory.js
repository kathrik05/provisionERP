import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  adjustStock,
  createItem,
  deactivateItem,
  listItems,
  updateItem,
} from "../api/inventory";

export function useInventoryList({ search, lowStockOnly }) {
  return useQuery({
    queryKey: ["inventory", { search: search ?? "", lowStockOnly: !!lowStockOnly }],
    queryFn: () => listItems({ search, low_stock: !!lowStockOnly }),
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      toast.success("Item saved");
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to create item");
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateItem(id, payload),
    onSuccess: () => {
      toast.success("Item updated");
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to update item");
    },
  });
}

export function useDeactivateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deactivateItem,
    onSuccess: () => {
      toast.success("Item deactivated");
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to deactivate item");
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => adjustStock(id, payload),
    onSuccess: () => {
      toast.success("Stock adjusted");
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to adjust stock");
    },
  });
}

