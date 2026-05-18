import { useQuery } from "@tanstack/react-query";
import {
  getDashboard,
  getInventoryReport,
  getOutstandingReport,
  getPaymentsReport,
  getSalesReport,
} from "../api/reports";

export function useDashboard() {
  return useQuery({ queryKey: ["reports", "dashboard"], queryFn: getDashboard });
}

export function useSalesReport(filters) {
  return useQuery({
    queryKey: ["reports", "sales", filters ?? {}],
    queryFn: () => getSalesReport(filters),
  });
}

export function useOutstandingReport() {
  return useQuery({
    queryKey: ["reports", "outstanding"],
    queryFn: getOutstandingReport,
  });
}

export function useInventoryReport() {
  return useQuery({
    queryKey: ["reports", "inventory"],
    queryFn: getInventoryReport,
  });
}

export function usePaymentsReport(filters) {
  return useQuery({
    queryKey: ["reports", "payments", filters ?? {}],
    queryFn: () => getPaymentsReport(filters),
  });
}

