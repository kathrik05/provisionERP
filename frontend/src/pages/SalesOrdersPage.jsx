import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSalesOrders, useConfirmSalesOrder } from "../hooks/useSales";

function StatusBadge({ status }) {
  const styles = {
    draft: "bg-gray-100 text-gray-700",
    confirmed: "bg-blue-50 text-primary-600",
    invoiced: "bg-amber-50 text-amber-700",
    paid: "bg-green-50 text-green-700",
  };
  return (
    <span className={["inline-flex px-2 py-1 rounded text-xs", styles[status] ?? styles.draft].join(" ")}>
      {status}
    </span>
  );
}

export default function SalesOrdersPage() {
  const nav = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const listQuery = useSalesOrders({ search, status });
  const confirmMut = useConfirmSalesOrder();

  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-base font-semibold">Sales Orders</h1>
        <button
          type="button"
          onClick={() => nav("/sales/new")}
          className="bg-primary-600 text-white text-sm px-3 py-2 rounded hover:opacity-95"
        >
          New Order
        </button>
      </header>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by order # or client…"
            className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left font-medium px-4 py-3">Order #</th>
                <th className="text-left font-medium px-4 py-3">Client</th>
                <th className="text-left font-medium px-4 py-3">Date</th>
                <th className="text-right font-medium px-4 py-3">Items</th>
                <th className="text-right font-medium px-4 py-3">Subtotal</th>
                <th className="text-right font-medium px-4 py-3">Total</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-600" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              ) : listQuery.isError ? (
                <tr>
                  <td className="px-4 py-6 text-center text-red-600" colSpan={8}>
                    Failed to load orders
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-600" colSpan={8}>
                    No orders found
                  </td>
                </tr>
              ) : (
                rows.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{o.order_number}</td>
                    <td className="px-4 py-3">{o.client?.name ?? "-"}</td>
                    <td className="px-4 py-3">{o.order_date}</td>
                    <td className="px-4 py-3 text-right">{o.items_count ?? 0}</td>
                    <td className="px-4 py-3 text-right">{o.subtotal}</td>
                    <td className="px-4 py-3 text-right">{o.total}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="p-2 rounded hover:bg-gray-100"
                          onClick={() => nav(`/sales/${o.id}`)}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {o.status === "draft" ? (
                          <>
                            <button
                              type="button"
                              className="p-2 rounded hover:bg-gray-100"
                              onClick={() => nav(`/sales/${o.id}/edit`)}
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="p-2 rounded hover:bg-gray-100 text-primary-600 disabled:opacity-50"
                              disabled={confirmMut.isPending}
                              onClick={() => confirmMut.mutate(o.id)}
                              title="Confirm"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

