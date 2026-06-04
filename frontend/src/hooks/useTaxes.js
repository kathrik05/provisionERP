import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createTaxRule,
  deactivateTaxRule,
  listTaxRules,
  setDefaultTaxRule,
  updateTaxRule,
} from "../api/taxes";

export function useTaxRules({ active_only } = {}) {
  return useQuery({
    queryKey: ["taxes", { active_only: !!active_only }],
    queryFn: () => listTaxRules({ active_only }),
  });
}

export function useCreateTaxRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTaxRule,
    onSuccess: () => {
      toast.success("Tax rule saved");
      qc.invalidateQueries({ queryKey: ["taxes"] });
    },
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to save"),
  });
}

export function useUpdateTaxRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateTaxRule(id, payload),
    onSuccess: () => {
      toast.success("Tax rule updated");
      qc.invalidateQueries({ queryKey: ["taxes"] });
    },
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to update"),
  });
}

export function useSetDefaultTaxRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setDefaultTaxRule,
    onSuccess: () => {
      toast.success("Default tax rule updated");
      qc.invalidateQueries({ queryKey: ["taxes"] });
    },
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to set default"),
  });
}

export function useDeactivateTaxRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deactivateTaxRule,
    onSuccess: () => {
      toast.success("Tax rule deactivated");
      qc.invalidateQueries({ queryKey: ["taxes"] });
    },
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to deactivate"),
  });
}

