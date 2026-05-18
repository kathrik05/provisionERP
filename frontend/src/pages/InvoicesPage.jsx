import { useEffect, useMemo, useState } from "react";
import { Download, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useInvoices } from "../hooks/useInvoices";
import SearchSelect from "../components/SearchSelect.jsx";
import { useClients } from "../hooks/useClients";

function StatusBadge({ status }) {
  const styles = {
    unpaid: "bg-red-50 text-red-700",
    partially_paid: "bg-amber-50 text-amber-700",
    paid: "bg-green-50 text-green-700",
  };
  return (
    <span className={["inline-flex px-2 py-1 rounded text-xs", styles[status] ?? styles.unpaid].join(" ")}>
      {status}
    </span>
  );
}

export default function InvoicesPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [client, setClient] = useState(null);
  const [clientSearch, setClientSearch] = useState("");
  const clientsQuery = useClients(clientSearch);

  const [overdueOnly, setOverdueOnly] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(loc.search);
    const s = p.get("status");
    if (s === "overdue") {
      setOverdueOnly(true);
      setStatus("all");
    } else if (s) {
      setOverdueOnly(false);
      setStatus(s);
    } else {
      setOverdueOnly(false);
    }
  }, [loc.search]);

  // backend doesn't have "search" yet; keep UI but don't send for now
  const filters = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      client_id: client?.id,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    }),
    [status, client?.id, fromDate, toDate],
  );

  const listQuery = useInvoices(filters);
  const today = new Date().toISOString().slice(0, 10);
  const rows = useMemo(() => {
    const all = listQuery.data ?? [];
    if (!overdueOnly) return all;
    return all.filter((inv) => inv.due_date < today && inv.status !== "paid");
  }, [listQuery.data, overdueOnly, today]);

  // today computed above

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-base font-semibold">Invoices</h1>
      </header>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search (coming soon)…"
            className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SearchSelect
            value={client?.id ?? ""}
            displayValue={client?.name ?? ""}
            placeholder="Filter by client…"
            options={clientsQuery.data ?? []}
            isLoading={clientsQuery.isLoading}
            isError={clientsQuery.isError}
            searchValue={clientSearch}
            onSearchChange={setClientSearch}
            getOptionLabel={(c) => c.name}
            getOptionValue={(c) => c.id}
            onChange={(c) => setClient({ id: c.id, name: c.name })}
          />
          <button
            type="button"
            className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
            onClick={() => setClient(null)}
          >
            Clear Client Filter
          </button>
        </div>

        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left font-medium px-4 py-3">Invoice #</th>
                <th className="text-left font-medium px-4 py-3">Client</th>
                <th className="text-left font-medium px-4 py-3">Order #</th>
                <th className="text-left font-medium px-4 py-3">Invoice Date</th>
                <th className="text-left font-medium px-4 py-3">Due Date</th>
                <th className="text-right font-medium px-4 py-3">Amount</th>
                <th className="text-right font-medium px-4 py-3">Paid</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-600" colSpan={9}>
                    Loading…
                  </td>
                </tr>
              ) : listQuery.isError ? (
                <tr>
                  <td className="px-4 py-6 text-center text-red-600" colSpan={9}>
                    Failed to load invoices
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-600" colSpan={9}>
                    No invoices found
                  </td>
                </tr>
              ) : (
                rows.map((inv) => {
                  const overdue = inv.due_date < today && inv.status !== "paid";
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{inv.invoice_number}</td>
                      <td className="px-4 py-3">{inv.client?.name ?? "-"}</td>
                      <td className="px-4 py-3">{inv.order?.order_number ?? "-"}</td>
                      <td className="px-4 py-3">{inv.invoice_date}</td>
                      <td className={["px-4 py-3", overdue ? "text-red-600" : ""].join(" ")}>
                        {inv.due_date}
                      </td>
                      <td className="px-4 py-3 text-right">{inv.amount_due}</td>
                      <td className="px-4 py-3 text-right">{inv.amount_paid}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            className="p-2 rounded hover:bg-gray-100"
                            onClick={() => nav(`/invoices/${inv.id}`)}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded hover:bg-gray-100"
                            onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/invoices/${inv.id}/pdf`, "_blank")}
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
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
