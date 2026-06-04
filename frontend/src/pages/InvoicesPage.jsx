import { useEffect, useMemo, useState } from "react";
import { Download, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useInvoices } from "../hooks/useInvoices";
import SearchSelect from "../components/SearchSelect.jsx";
import { useClients } from "../hooks/useClients";
import DataTable from "../ui/DataTable.jsx";
import TableRowCard from "../ui/TableRowCard.jsx";
import StatusPill from "../ui/StatusPill.jsx";

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

        <DataTable
          gridCols="sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr_1fr_1fr_1fr_100px]"
          columns={[
            { key: "invoice_number", header: "Invoice #" },
            { key: "client", header: "Client" },
            { key: "order_number", header: "Order #" },
            { key: "invoice_date", header: "Invoice Date" },
            { key: "due_date", header: "Due Date" },
            { key: "amount_due", header: "Amount", align: "right" },
            { key: "amount_paid", header: "Paid", align: "right" },
            { key: "status", header: "Status" },
            { key: "actions", header: "Actions", align: "right" },
          ]}
          rows={listQuery.isLoading || listQuery.isError ? [] : rows}
          empty={
            listQuery.isLoading
              ? "Loading…"
              : listQuery.isError
                ? "Failed to load invoices"
                : "No invoices found"
          }
          renderRow={(inv) => {
            const overdue = inv.due_date < today && inv.status !== "paid";
            return (
              <TableRowCard key={inv.id}>
                <div className="font-semibold text-[#111] truncate">{inv.invoice_number}</div>
                <div className="text-sm text-gray-500 truncate">{inv.client?.name ?? "-"}</div>
                <div className="text-sm text-gray-500 truncate">{inv.order?.order_number ?? "-"}</div>
                <div className="text-sm text-gray-500 whitespace-nowrap">{inv.invoice_date}</div>
                <div className={["text-sm whitespace-nowrap", overdue ? "text-red-600 font-semibold" : "text-gray-500"].join(" ")}>
                  {inv.due_date}
                </div>
                <div className="text-right whitespace-nowrap text-[#111] font-semibold">{inv.amount_due}</div>
                <div className="text-right whitespace-nowrap text-gray-600">{inv.amount_paid}</div>
                <div>
                  <StatusPill status={inv.status} />
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-brand hover:bg-[#F5F5F5] transition-colors"
                    onClick={() => nav(`/invoices/${inv.id}`)}
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-brand hover:bg-[#F5F5F5] transition-colors"
                    onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/invoices/${inv.id}/pdf`, "_blank")}
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </TableRowCard>
            );
          }}
        />
      </div>
    </div>
  );
}
