import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { listSuppliers, deactivateSupplier } from "../api/suppliers";
import SupplierFormModal from "../components/SupplierFormModal";
import toast from "react-hot-toast";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => listSuppliers({ search }),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier deactivated");
    },
    onError: () => toast.error("Failed to deactivate supplier"),
  });

  const handleDeactivate = (id) => {
    if (confirm("Are you sure you want to deactivate this supplier?")) {
      deactivateMutation.mutate(id);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
        <button
          type="button"
          className="ui-btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingSupplier(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      <div className="ui-card mb-6">
        <div className="p-4 border-b border-app-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-tertiary" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ui-input pl-9 w-full"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-app-border bg-app-bg/50">
                <th className="px-4 py-3 font-medium text-app-text-secondary">Name</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary">Contact Person</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary">Phone</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary">Credit Limit</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary">Credit Days</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary text-right">Outstanding</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-app-text-secondary">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-app-text-secondary">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-app-bg/50 transition">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/suppliers/${sup.id}`} className="text-brand hover:underline">
                        {sup.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{sup.contact_person || "-"}</td>
                    <td className="px-4 py-3">{sup.phone || "-"}</td>
                    <td className="px-4 py-3">₹{sup.credit_limit}</td>
                    <td className="px-4 py-3">{sup.credit_days}</td>
                    <td className={`px-4 py-3 text-right font-medium ${sup.outstanding_balance > 0 ? "text-red-600" : ""}`}>
                      ₹{sup.outstanding_balance}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(sup)}
                          className="p-1.5 text-app-text-tertiary hover:text-brand hover:bg-emerald-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeactivate(sup.id)}
                          className="p-1.5 text-app-text-tertiary hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <SupplierFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplier={editingSupplier}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["suppliers"] })}
      />
    </div>
  );
}
