import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listItems } from "../api/inventory";
import { listSuppliers } from "../api/suppliers";
import { createPurchase, updatePurchase, getPurchase } from "../api/purchases";
import toast from "react-hot-toast";

export function useInventoryItems(search = "") {
  return useQuery({
    queryKey: ["inventoryItems", search],
    queryFn: () => listItems({ search }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => listSuppliers(),
  });
}
