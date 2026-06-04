import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  confirmSalesOrder,
  createSalesOrder,
  getSalesOrder,
  listSalesOrders,
  overrideLineTax,
  updateExtraCharge,
  updateSalesOrder,
} from "../api/sales";

export function useSalesOrders({ search, status, client_id }) {
  return useQuery({
    queryKey: ["sales", { search: search ?? "", status: status ?? "all", client_id: client_id ?? "" }],
    queryFn: () => listSalesOrders({ search, status, client_id }),
  });
}

export function useSalesOrder(id) {
  return useQuery({
    queryKey: ["sales", id],
    queryFn: () => getSalesOrder(id),
    enabled: !!id,
  });
}

export function useCreateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSalesOrder,
    onSuccess: () => {
      toast.success("Order created");
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to create order");
    },
  });
}

export function useUpdateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateSalesOrder(id, payload),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to update order");
    },
  });
}

export function useConfirmSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: confirmSalesOrder,
    onSuccess: () => {
      toast.success("Order confirmed");
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to confirm order");
    },
  });
}

export function useUpdateExtraCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateExtraCharge(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to update extra charge");
    },
  });
}

export function useOverrideLineTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: overrideLineTax,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to update tax");
    },
  });
}
