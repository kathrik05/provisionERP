import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import SearchSelect from "../components/SearchSelect.jsx";
import { useClients } from "../hooks/useClients";
import { useInventoryReport, useOutstandingReport, usePaymentsReport, useSalesReport, useProfitSummary, useProfitByItem, useProfitByClient } from "../hooks/useReports";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

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
          <div className="w-px h-6 bg-app-border mx-1"></div>
          <TabButton active={tab === "profit_summary"} onClick={() => setTab("profit_summary")}>Profit Summary</TabButton>
          <TabButton active={tab === "profit_by_item"} onClick={() => setTab("profit_by_item")}>Profit By Item</TabButton>
          <TabButton active={tab === "profit_by_client"} onClick={() => setTab("profit_by_client")}>Profit By Client</TabButton>
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

        {tab === "profit_summary" ? (
          <ProfitSummaryTab fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} />
        ) : null}

        {tab === "profit_by_item" ? (
          <ProfitByItemTab fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} />
        ) : null}

        {tab === "profit_by_client" ? (
          <ProfitByClientTab fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} />
        ) : null}
      </div>
    </div>
  );
}

function ProfitSummaryTab({ fromDate, setFromDate, toDate, setToDate }) {
  const query = useProfitSummary({ from_date: fromDate || undefined, to_date: toDate || undefined });
  
  if (query.isLoading) return <div className="ui-card p-6 text-sm text-app-text-secondary animate-pulse">Loading profit summary...</div>;
  if (query.isError) return <div className="ui-card p-6 text-sm text-red-600">Failed to load profit summary</div>;

  const data = query.data;
  
  const chartData = [
    {
      name: "Financials",
      Revenue: data.total_revenue,
      Cost: data.total_cost,
      Profit: data.total_profit
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 no-print mb-4">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Revenue" value={`₹${data.total_revenue.toFixed(2)}`} />
        <StatsCard title="Total Cost" value={`₹${data.total_cost.toFixed(2)}`} />
        <StatsCard title="Total Profit" value={`₹${data.total_profit.toFixed(2)}`} accentClassName={data.total_profit > 0 ? "text-emerald-600" : "text-red-600"} />
        <StatsCard title="Avg Margin" value={`${data.avg_margin_percent.toFixed(2)}%`} accentClassName={data.avg_margin_percent > 20 ? "text-emerald-600" : data.avg_margin_percent > 10 ? "text-amber-600" : "text-red-600"} />
      </div>

      <div className="ui-card p-6 h-[400px]">
        <h3 className="text-lg font-semibold mb-4">Revenue vs Cost vs Profit</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => `₹${value}`} />
            <RechartsTooltip formatter={(value) => [`₹${value.toFixed(2)}`]} />
            <Legend />
            <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function ProfitByItemTab({ fromDate, setFromDate, toDate, setToDate }) {
  const query = useProfitByItem({ from_date: fromDate || undefined, to_date: toDate || undefined });
  
  if (query.isLoading) return <div className="ui-card p-6 text-sm text-app-text-secondary animate-pulse">Loading item profit...</div>;
  if (query.isError) return <div className="ui-card p-6 text-sm text-red-600">Failed to load item profit</div>;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 no-print mb-4">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
      </div>

      <DataTable
        gridCols="sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr]"
        columns={[
          { key: "item_name", header: "Item" },
          { key: "qty", header: "Qty Sold", align: "right" },
          { key: "avg_sell", header: "Avg Selling", align: "right" },
          { key: "avg_cost", header: "Avg Cost", align: "right" },
          { key: "margin", header: "Avg Margin %", align: "right" },
          { key: "profit", header: "Total Profit", align: "right" },
        ]}
        rows={query.data?.data || []}
        empty="No data"
        renderRow={(i, idx) => {
          const margin = i.avg_margin_percent;
          return (
            <TableRowCard key={idx} className={margin < 10 ? "border-amber-200 bg-amber-50/50" : ""}>
              <div className="font-semibold text-[#111] truncate">{i.item_name}</div>
              <div className="text-sm text-gray-600 text-right">{i.total_sold_qty.toFixed(2)}</div>
              <div className="text-sm text-gray-600 text-right">₹{i.avg_selling_price.toFixed(2)}</div>
              <div className="text-sm text-gray-600 text-right">₹{i.avg_cost_price.toFixed(2)}</div>
              <div className={`text-right font-semibold ${margin < 10 ? "text-amber-600" : margin > 20 ? "text-emerald-600" : "text-gray-600"}`}>
                {margin.toFixed(2)}%
              </div>
              <div className={`text-right font-bold ${i.total_profit > 0 ? "text-emerald-600" : "text-red-600"}`}>
                ₹{i.total_profit.toFixed(2)}
              </div>
            </TableRowCard>
          );
        }}
      />
    </>
  );
}

function ProfitByClientTab({ fromDate, setFromDate, toDate, setToDate }) {
  const query = useProfitByClient({ from_date: fromDate || undefined, to_date: toDate || undefined });
  
  if (query.isLoading) return <div className="ui-card p-6 text-sm text-app-text-secondary animate-pulse">Loading client profit...</div>;
  if (query.isError) return <div className="ui-card p-6 text-sm text-red-600">Failed to load client profit</div>;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 no-print mb-4">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
      </div>

      <DataTable
        gridCols="sm:grid-cols-[2fr_1fr_1fr_1fr_1fr]"
        columns={[
          { key: "client_name", header: "Client" },
          { key: "revenue", header: "Total Revenue", align: "right" },
          { key: "cost", header: "Total Cost", align: "right" },
          { key: "margin", header: "Avg Margin %", align: "right" },
          { key: "profit", header: "Total Profit", align: "right" },
        ]}
        rows={query.data?.data || []}
        empty="No data"
        renderRow={(c, idx) => (
          <TableRowCard key={idx}>
            <div className="font-semibold text-[#111] truncate">{c.client_name}</div>
            <div className="text-sm text-gray-600 text-right">₹{c.total_revenue.toFixed(2)}</div>
            <div className="text-sm text-gray-600 text-right">₹{c.total_cost.toFixed(2)}</div>
            <div className="text-right font-semibold text-gray-600">{c.avg_margin_percent.toFixed(2)}%</div>
            <div className={`text-right font-bold ${c.total_profit > 0 ? "text-emerald-600" : "text-red-600"}`}>
              ₹{c.total_profit.toFixed(2)}
            </div>
          </TableRowCard>
        )}
      />
    </>
  );
}
