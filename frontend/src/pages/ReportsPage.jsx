import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import SearchSelect from "../components/SearchSelect.jsx";
import { useClients } from "../hooks/useClients";
import { useInventoryReport, useOutstandingReport, usePaymentsReport, useSalesReport } from "../hooks/useReports";

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-sm px-5 py-2 rounded-full font-medium transition-all duration-300 active:scale-95",
        active
          ? "bg-brand text-white shadow-soft"
          : "text-app-text-secondary hover:bg-white/70 hover:text-app-text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

import DataTable from "../ui/DataTable.jsx";
import TableRowCard from "../ui/TableRowCard.jsx";
import StatusPill from "../ui/StatusPill.jsx";
import StatsCard from "../ui/StatsCard.jsx";

export default function ReportsPage() {
  const loc = useLocation();
  const initialTab = new URLSearchParams(loc.search).get("tab") || "sales";
  const [tab, setTab] = useState(initialTab);

  // Sales filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [client, setClient] = useState(null);
  const [clientSearch, setClientSearch] = useState("");
  const clientsQuery = useClients(clientSearch);

  const salesFilters = useMemo(
    () => ({
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      client_id: client?.id,
    }),
    [fromDate, toDate, client?.id],
  );

  const salesQ = useSalesReport(salesFilters);
  const outstandingQ = useOutstandingReport();
  const invQ = useInventoryReport();
  const payQ = usePaymentsReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 no-print">
        <h1 className="text-base font-semibold">Reports</h1>
        <button type="button" className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50" onClick={() => window.print()}>
          Print
        </button>
      </header>

      <div className="px-6 pt-4 no-print">
        <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-full w-max border border-app-border/50">
          <TabButton active={tab === "sales"} onClick={() => setTab("sales")}>Sales</TabButton>
          <TabButton active={tab === "outstanding"} onClick={() => setTab("outstanding")}>Outstanding</TabButton>
          <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>Inventory</TabButton>
          <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>Payments</TabButton>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {tab === "sales" ? (
          <>
            <div className="grid grid-cols-4 gap-3 no-print">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
              <SearchSelect
                value={client?.id ?? ""}
                displayValue={client?.name ?? ""}
                placeholder="Client…"
                options={clientsQuery.data ?? []}
                isLoading={clientsQuery.isLoading}
                isError={clientsQuery.isError}
                searchValue={clientSearch}
                onSearchChange={setClientSearch}
                getOptionLabel={(c) => c.name}
                getOptionValue={(c) => c.id}
                onChange={(c) => setClient({ id: c.id, name: c.name })}
              />
              <button type="button" className="text-sm px-4 py-2 rounded-2xl bg-emerald-50 text-brand hover:bg-emerald-100 font-medium transition-colors active:scale-95" onClick={() => setClient(null)}>
                Clear
              </button>
            </div>

            {salesQ.isLoading ? (
              <div className="ui-card p-6 text-sm text-app-text-secondary animate-pulse flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gray-200"></div> Loading sales data…
              </div>
            ) : salesQ.isError ? (
              <div className="ui-card p-6 text-sm text-red-600">Failed to load sales report</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatsCard title="Order Count" value={salesQ.data.summary.order_count} />
                  <StatsCard title="Subtotal" value={salesQ.data.summary.subtotal} />
                  <StatsCard title="Tax" value={salesQ.data.summary.tax_amount} />
                  <StatsCard title="Grand Total" value={salesQ.data.summary.grand_total} accentClassName="text-brand" />
                </div>

                <DataTable
                  gridCols="sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr_1fr_1fr_100px]"
                  columns={[
                    { key: "order_number", header: "Order #" },
                    { key: "client", header: "Client" },
                    { key: "date", header: "Date" },
                    { key: "subtotal", header: "Subtotal", align: "right" },
                    { key: "tax", header: "Tax", align: "right" },
                    { key: "extra_charge", header: "Extra Charge", align: "right" },
                    { key: "total", header: "Total", align: "right" },
                    { key: "status", header: "Status" },
                  ]}
                  rows={salesQ.data.orders}
                  empty="No data"
                  renderRow={(o) => (
                    <TableRowCard key={o.order_number}>
                      <div className="font-semibold text-[#111] truncate">{o.order_number}</div>
                      <div className="text-sm text-gray-500 truncate">{o.client_name ?? "-"}</div>
                      <div className="text-sm text-gray-500 whitespace-nowrap">{o.date}</div>
                      <div className="text-sm text-gray-600 text-right whitespace-nowrap">{o.subtotal}</div>
                      <div className="text-sm text-gray-600 text-right whitespace-nowrap">{o.tax}</div>
                      <div className="text-sm text-gray-600 text-right whitespace-nowrap">{o.extra_charge}</div>
                      <div className="text-right whitespace-nowrap font-semibold text-[#111]">{o.total}</div>
                      <div>
                        <StatusPill status={o.status} />
                      </div>
                    </TableRowCard>
                  )}
                />
              </>
            )}
          </>
        ) : null}

        {tab === "outstanding" ? (
          outstandingQ.isLoading ? (
            <div className="ui-card p-6 text-sm text-app-text-secondary animate-pulse flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gray-200"></div> Loading outstanding report…
            </div>
          ) : outstandingQ.isError ? (
            <div className="ui-card p-6 text-sm text-red-600">Failed to load outstanding report</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard title="Total Outstanding" value={outstandingQ.data.total_outstanding} accentClassName={outstandingQ.data.total_outstanding > 0 ? "text-red-600" : "text-brand"} />
              </div>
              <DataTable
                gridCols="sm:grid-cols-[1.5fr_1.2fr_1fr_1fr_1fr_1fr_1fr]"
                columns={[
                  { key: "client", header: "Client" },
                  { key: "phone", header: "Phone" },
                  { key: "total_invoiced", header: "Total Invoiced", align: "right" },
                  { key: "total_paid", header: "Total Paid", align: "right" },
                  { key: "balance_due", header: "Balance Due", align: "right" },
                  { key: "overdue_invoices", header: "Overdue Invoices", align: "right" },
                  { key: "last_payment", header: "Last Payment" },
                ]}
                rows={outstandingQ.data.clients}
                empty="No data"
                renderRow={(c) => (
                  <TableRowCard key={c.client_name} className={c.overdue_invoices > 0 ? "border-red-200 bg-red-50/50" : ""}>
                    <div className="font-semibold text-[#111] truncate">{c.client_name}</div>
                    <div className="text-sm text-gray-500 whitespace-nowrap">{c.phone ?? "-"}</div>
                    <div className="text-sm text-gray-600 text-right whitespace-nowrap">{c.total_invoiced}</div>
                    <div className="text-sm text-gray-600 text-right whitespace-nowrap">{c.total_paid}</div>
                    <div className="text-right whitespace-nowrap font-semibold text-[#111]">{c.balance_due}</div>
                    <div className={["text-right whitespace-nowrap font-semibold", c.overdue_invoices > 0 ? "text-red-600" : "text-gray-600"].join(" ")}>
                      {c.overdue_invoices}
                    </div>
                    <div className="text-sm text-gray-500 whitespace-nowrap">{c.last_payment_date ?? "-"}</div>
                  </TableRowCard>
                )}
              />
            </>
          )
        ) : null}

        {tab === "inventory" ? (
          invQ.isLoading ? (
            <div className="ui-card p-6 text-sm text-app-text-secondary animate-pulse flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gray-200"></div> Loading inventory report…
            </div>
          ) : invQ.isError ? (
            <div className="ui-card p-6 text-sm text-red-600">Failed to load inventory report</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Items" value={invQ.data.total_items} />
                <StatsCard title="Stocked" value={invQ.data.stocked_items} />
                <StatsCard title="On Demand" value={invQ.data.on_demand_items} />
                <StatsCard title="Low Stock" value={invQ.data.low_stock_items} accentClassName={invQ.data.low_stock_items > 0 ? "text-red-600" : ""} />
              </div>
              <DataTable
                gridCols="sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr_100px]"
                columns={[
                  { key: "name", header: "Name" },
                  { key: "category", header: "Category" },
                  { key: "unit", header: "Unit" },
                  { key: "price", header: "Price", align: "right" },
                  { key: "type", header: "Type" },
                  { key: "stock", header: "Stock", align: "right" },
                  { key: "reorder", header: "Reorder Level", align: "right" },
                  { key: "status", header: "Status" },
                ]}
                rows={invQ.data.items}
                empty="No data"
                renderRow={(i) => (
                  <TableRowCard key={i.name}>
                    <div className="font-semibold text-[#111] truncate">{i.name}</div>
                    <div className="text-sm text-gray-500 truncate">{i.category ?? "-"}</div>
                    <div className="text-sm text-gray-500 whitespace-nowrap">{i.unit}</div>
                    <div className="text-sm text-[#111] font-medium text-right whitespace-nowrap">{i.price}</div>
                    <div>
                      {i.track_stock ? (
                        <StatusPill status="Stocked" />
                      ) : (
                        <StatusPill status="On Demand" className="bg-gray-100 text-gray-700" />
                      )}
                    </div>
                    <div className="text-right whitespace-nowrap text-[#111] font-medium">
                      {i.track_stock ? i.stock_quantity : "-"}
                    </div>
                    <div className="text-right whitespace-nowrap text-gray-600">
                      {i.track_stock ? i.reorder_level : "-"}
                    </div>
                    <div>
                      <StatusPill status={i.status} />
                    </div>
                  </TableRowCard>
                )}
              />
            </>
          )
        ) : null}

        {tab === "payments" ? (
          payQ.isLoading ? (
            <div className="ui-card p-6 text-sm text-app-text-secondary animate-pulse flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gray-200"></div> Loading payments report…
            </div>
          ) : payQ.isError ? (
            <div className="ui-card p-6 text-sm text-red-600">Failed to load payments report</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 no-print">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Received" value={payQ.data.summary.total_received} accentClassName="text-brand" />
                <StatsCard title="Cash" value={payQ.data.summary.by_method.cash} />
                <StatsCard title="Bank Transfer" value={payQ.data.summary.by_method.bank_transfer} />
                <StatsCard title="Cheque" value={payQ.data.summary.by_method.cheque} />
              </div>

              <DataTable
                gridCols="sm:grid-cols-[1fr_1.5fr_1.2fr_1fr_1fr_1fr]"
                columns={[
                  { key: "date", header: "Date" },
                  { key: "client", header: "Client" },
                  { key: "invoice_number", header: "Invoice #" },
                  { key: "amount", header: "Amount", align: "right" },
                  { key: "method", header: "Method" },
                  { key: "notes", header: "Notes" },
                ]}
                rows={payQ.data.payments}
                empty="No payments"
                renderRow={(p, idx) => (
                  <TableRowCard key={idx}>
                    <div className="font-semibold text-[#111] whitespace-nowrap">{p.date}</div>
                    <div className="text-sm text-gray-500 truncate">{p.client_name ?? "-"}</div>
                    <div className="text-sm text-gray-500 truncate">{p.invoice_number ?? "-"}</div>
                    <div className="text-right whitespace-nowrap text-[#111] font-semibold">{p.amount}</div>
                    <div className="text-sm text-gray-500">{p.method}</div>
                    <div className="text-sm text-gray-500 truncate">{p.notes ?? "-"}</div>
                  </TableRowCard>
                )}
              />
            </>
          )
        ) : null}
      </div>
    </div>
  );
}
