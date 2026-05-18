import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  generateInvoice,
  getInvoice,
  listInvoices,
  listPayments,
  recordPayment,
} from "../api/invoices";

export function useInvoices(filters) {
  return useQuery({
    queryKey: ["invoices", filters ?? {}],
    queryFn: () => listInvoices(filters),
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => getInvoice(id),
    enabled: !!id,
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, payload }) => generateInvoice(orderId, payload),
    onSuccess: () => {
      toast.success("Invoice generated");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to generate invoice"),
  });
}

export function useInvoicePayments(invoiceId) {
  return useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: () => listPayments(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, payload }) => recordPayment(invoiceId, payload),
    onSuccess: (_data, vars) => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices", vars.invoiceId] });
      qc.invalidateQueries({ queryKey: ["payments", vars.invoiceId] });
    },
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to record payment"),
  });
}

