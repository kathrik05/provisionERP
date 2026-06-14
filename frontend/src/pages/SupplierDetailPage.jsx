import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Plus, ArrowLeft } from "lucide-react";
import { getSupplier } from "../api/suppliers";
import { listPurchases } from "../api/purchases";

export default function SupplierDetailPage() {
  const { id } = useParams();

  const { data: supplier, isLoading: isLoadingSupplier } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => getSupplier(id),
  });

  const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery({
    queryKey: ["purchases", { supplier_id: id }],
    queryFn: () => listPurchases({ supplier_id: id }),
  });

  if (isLoadingSupplier) return <div className="p-6">Loading supplier...</div>;
  if (!supplier) return <div className="p-6">Supplier not found.</div>;

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/suppliers" className="text-app-text-tertiary hover:text-brand transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
        <div className="ml-auto">
          <Link to={`/purchases/new?supplier_id=${id}`} className="ui-btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Purchase Order
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="ui-card p-5 h-full">
            <h2 className="text-lg font-semibold mb-4">Supplier Info</h2>
            <div className="space-y-4 text-sm">
              <div>
                <span className="block text-app-text-tertiary mb-1">Outstanding Balance</span>
                <span className={`text-xl font-bold ${supplier.outstanding_balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  ₹{supplier.outstanding_balance}
                </span>
              </div>
              <div>
                <span className="block text-app-text-tertiary">Contact Person</span>
                <span className="font-medium">{supplier.contact_person || "-"}</span>
              </div>
              <div>
                <span className="block text-app-text-tertiary">Phone</span>
                <span className="font-medium">{supplier.phone || "-"}</span>
              </div>
              <div>
                <span className="block text-app-text-tertiary">Email</span>
                <span className="font-medium">{supplier.email || "-"}</span>
              </div>
              <div>
                <span className="block text-app-text-tertiary">Credit Terms</span>
                <span className="font-medium">₹{supplier.credit_limit} Limit / {supplier.credit_days} Days</span>
              </div>
              <div>
                <span className="block text-app-text-tertiary">Address</span>
                <span className="font-medium">{supplier.address || "-"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="ui-card overflow-hidden">
            <div className="px-5 py-4 border-b border-app-border">
              <h2 className="text-lg font-semibold">Purchase Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-app-bg/50 border-b border-app-border">
                    <th className="px-4 py-3 font-medium text-app-text-secondary">PO #</th>
                    <th className="px-4 py-3 font-medium text-app-text-secondary">Date</th>
                    <th className="px-4 py-3 font-medium text-app-text-secondary">Total</th>
                    <th className="px-4 py-3 font-medium text-app-text-secondary">Paid</th>
                    <th className="px-4 py-3 font-medium text-app-text-secondary">Due Date</th>
                    <th className="px-4 py-3 font-medium text-app-text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {isLoadingPurchases ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-app-text-secondary">
                        Loading purchase orders...
                      </td>
                    </tr>
                  ) : purchases.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-app-text-secondary">
                        No purchase orders found.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((po) => {
                      const isOverdue = new Date(po.due_date) < new Date() && po.status !== "paid";
                      return (
                        <tr key={po.id} className="hover:bg-app-bg/50 transition">
                          <td className="px-4 py-3 font-medium">
                            <Link to={`/purchases/${po.id}`} className="text-brand hover:underline">
                              {po.purchase_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3">{po.purchase_date}</td>
                          <td className="px-4 py-3">₹{po.total}</td>
                          <td className="px-4 py-3">₹{po.amount_paid}</td>
                          <td className={`px-4 py-3 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                            {po.due_date || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                              ${po.status === "pending" ? "bg-gray-100 text-gray-700" :
                                po.status === "received" ? "bg-blue-100 text-blue-700" :
                                po.status === "partially_paid" ? "bg-amber-100 text-amber-700" :
                                "bg-emerald-100 text-emerald-700"}`}
                            >
                              {po.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
