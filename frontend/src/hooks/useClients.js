import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createClient,
  deactivateClient,
  listClients,
  updateClient,
} from "../api/clients";

export function useClients(search) {
  return useQuery({
    queryKey: ["clients", { search: search ?? "" }],
    queryFn: () => listClients(search),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      toast.success("Client saved");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to create client");
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateClient(id, payload),
    onSuccess: () => {
      toast.success("Client updated");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to update client");
    },
  });
}

export function useDeactivateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deactivateClient,
    onSuccess: () => {
      toast.success("Client deactivated");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error ?? "Failed to deactivate client");
    },
  });
}

