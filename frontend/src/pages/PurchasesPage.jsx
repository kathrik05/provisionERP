import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { listPurchases } from "../api/purchases";
import { listSuppliers } from "../api/suppliers";

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("");

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases", supplierId, status],
    queryFn: () => listPurchases({ supplier_id: supplierId || undefined, status: status || undefined }),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => listSuppliers(),
  });

  const filteredPurchases = purchases.filter((po) =>
    po.purchase_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
        <Link to="/purchases/new" className="ui-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Purchase Order
        </Link>
      </div>

      <div className="ui-card mb-6">
        <div className="p-4 border-b border-app-border flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-tertiary" />
            <input
              type="text"
              placeholder="Search PO number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ui-input pl-9 w-full"
            />
          </div>
          
          <div className="w-48">
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="ui-input w-full"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div className="w-48">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="ui-input w-full"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-app-border bg-app-bg/50">
                <th className="px-4 py-3 font-medium text-app-text-secondary">PO #</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary">Supplier</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary">Date</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary">Total</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary">Paid</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary">Due Date</th>
                <th className="px-4 py-3 font-medium text-app-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-app-text-secondary">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-app-text-secondary">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((po) => {
                  const isOverdue = new Date(po.due_date) < new Date() && po.status !== "paid";
                  // In a real app we'd populate supplier name in the list endpoint or client-side join
                  const supplierName = suppliers.find(s => s.id === po.supplier_id)?.name || "Unknown";
                  
                  return (
                    <tr key={po.id} className="hover:bg-app-bg/50 transition">
                      <td className="px-4 py-3 font-medium">
                        <Link to={`/purchases/${po.id}`} className="text-brand hover:underline">
                          {po.purchase_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{supplierName}</td>
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
  );
}
