import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  analyseClient,
  listActiveOffers,
  listClientOffers,
  simulateOffer,
  updateOfferStatus,
} from "../api/offers";

export function useClientOffers(clientId) {
  return useQuery({
    queryKey: ["offers", "client", clientId],
    queryFn: () => listClientOffers(clientId),
    enabled: !!clientId,
  });
}

export function useAnalyseClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (clientId) => analyseClient(clientId),
    onSuccess: (_data, clientId) => {
      qc.invalidateQueries({ queryKey: ["offers", "client", clientId] });
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Analysis failed. Try again.";
      toast.error(msg);
    },
  });
}

export function useUpdateOfferStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, status }) => updateOfferStatus(offerId, status),
    onSuccess: (data) => {
      toast.success(`Offer ${data.status}`);
      qc.invalidateQueries({ queryKey: ["offers", "active"] });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error ?? "Failed to update offer status"),
  });
}

export function useActiveOffers() {
  return useQuery({
    queryKey: ["offers", "active"],
    queryFn: listActiveOffers,
  });
}

export function useOfferSimulator() {
  return useMutation({
    mutationFn: simulateOffer,
    onError: (err) =>
      toast.error(err?.response?.data?.error ?? "Failed to simulate"),
  });
}
