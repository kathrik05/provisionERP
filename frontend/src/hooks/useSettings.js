import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  disconnectDrive,
  getDriveAuthUrl,
  getSettings,
  uploadLogo,
  upsertSettings,
} from "../api/settings";

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: getSettings });
}

export function useUpsertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertSettings,
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to save"),
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadLogo,
    onSuccess: () => {
      toast.success("Logo updated");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to upload logo"),
  });
}

export function useDriveAuthUrl() {
  return useMutation({
    mutationFn: getDriveAuthUrl,
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to get auth URL"),
  });
}

export function useDisconnectDrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: disconnectDrive,
    onSuccess: () => {
      toast.success("Drive disconnected");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => toast.error(err?.response?.data?.error ?? "Failed to disconnect"),
  });
}

