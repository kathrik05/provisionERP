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
        "text-sm px-3 py-2 rounded",
        active ? "bg-blue-50 text-primary-600" : "text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ok: "bg-green-50 text-green-700",
    low: "bg-amber-50 text-amber-700",
    on_demand: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={["inline-flex px-2 py-1 rounded text-xs", styles[status] ?? "bg-gray-100 text-gray-700"].join(" ")}>
      {status}
    </span>
  );
}

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
        <div className="flex items-center gap-2">
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
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
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
              <button type="button" className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50" onClick={() => setClient(null)}>
                Clear Client
              </button>
            </div>

            {salesQ.isLoading ? (
              <div className="bg-white rounded border border-gray-200 p-6 text-sm text-gray-600">Loading…</div>
            ) : salesQ.isError ? (
              <div className="bg-white rounded border border-gray-200 p-6 text-sm text-red-600">Failed to load sales report</div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-white rounded border border-gray-200 p-4">
                    <div className="text-xs text-gray-600">Order Count</div>
                    <div className="mt-2 text-lg font-semibold">{salesQ.data.summary.order_count}</div>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-4">
                    <div className="text-xs text-gray-600">Subtotal</div>
                    <div className="mt-2 text-lg font-semibold">{salesQ.data.summary.subtotal}</div>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-4">
                    <div className="text-xs text-gray-600">Tax</div>
                    <div className="mt-2 text-lg font-semibold">{salesQ.data.summary.tax_amount}</div>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-4">
                    <div className="text-xs text-gray-600">Grand Total</div>
                    <div className="mt-2 text-lg font-semibold">{salesQ.data.summary.grand_total}</div>
                  </div>
                </div>

                <div className="bg-white rounded border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="text-left font-medium px-4 py-3">Order #</th>
                        <th className="text-left font-medium px-4 py-3">Client</th>
                        <th className="text-left font-medium px-4 py-3">Date</th>
                        <th className="text-right font-medium px-4 py-3">Subtotal</th>
                        <th className="text-right font-medium px-4 py-3">Tax</th>
                        <th className="text-right font-medium px-4 py-3">Extra Charge</th>
                        <th className="text-right font-medium px-4 py-3">Total</th>
                        <th className="text-left font-medium px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesQ.data.orders.map((o) => (
                        <tr key={o.order_number} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{o.order_number}</td>
                          <td className="px-4 py-3">{o.client_name ?? "-"}</td>
                          <td className="px-4 py-3">{o.date}</td>
                          <td className="px-4 py-3 text-right">{o.subtotal}</td>
                          <td className="px-4 py-3 text-right">{o.tax}</td>
                          <td className="px-4 py-3 text-right">{o.extra_charge}</td>
                          <td className="px-4 py-3 text-right">{o.total}</td>
                          <td className="px-4 py-3">{o.status}</td>
                        </tr>
                      ))}
                      {salesQ.data.orders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-gray-600">
                            No data
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        ) : null}

        {tab === "outstanding" ? (
          outstandingQ.isLoading ? (
            <div className="bg-white rounded border border-gray-200 p-6 text-sm text-gray-600">Loading…</div>
          ) : outstandingQ.isError ? (
            <div className="bg-white rounded border border-gray-200 p-6 text-sm text-red-600">Failed to load outstanding report</div>
          ) : (
            <>
              <div className={["bg-white rounded border border-gray-200 p-5 text-lg font-semibold", outstandingQ.data.total_outstanding > 0 ? "text-red-600" : ""].join(" ")}>
                Total Outstanding: {outstandingQ.data.total_outstanding}
              </div>
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Client</th>
                      <th className="text-left font-medium px-4 py-3">Phone</th>
                      <th className="text-right font-medium px-4 py-3">Total Invoiced</th>
                      <th className="text-right font-medium px-4 py-3">Total Paid</th>
                      <th className="text-right font-medium px-4 py-3">Balance Due</th>
                      <th className="text-right font-medium px-4 py-3">Overdue Invoices</th>
                      <th className="text-left font-medium px-4 py-3">Last Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstandingQ.data.clients.map((c) => (
                      <tr key={c.client_name} className={c.overdue_invoices > 0 ? "bg-red-50" : "hover:bg-gray-50"}>
                        <td className="px-4 py-3">{c.client_name}</td>
                        <td className="px-4 py-3">{c.phone ?? "-"}</td>
                        <td className="px-4 py-3 text-right">{c.total_invoiced}</td>
                        <td className="px-4 py-3 text-right">{c.total_paid}</td>
                        <td className="px-4 py-3 text-right">{c.balance_due}</td>
                        <td className="px-4 py-3 text-right">{c.overdue_invoices}</td>
                        <td className="px-4 py-3">{c.last_payment_date ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : null}

        {tab === "inventory" ? (
          invQ.isLoading ? (
            <div className="bg-white rounded border border-gray-200 p-6 text-sm text-gray-600">Loading…</div>
          ) : invQ.isError ? (
            <div className="bg-white rounded border border-gray-200 p-6 text-sm text-red-600">Failed to load inventory report</div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded border border-gray-200 p-4">
                  <div className="text-xs text-gray-600">Total Items</div>
                  <div className="mt-2 text-lg font-semibold">{invQ.data.total_items}</div>
                </div>
                <div className="bg-white rounded border border-gray-200 p-4">
                  <div className="text-xs text-gray-600">Stocked</div>
                  <div className="mt-2 text-lg font-semibold">{invQ.data.stocked_items}</div>
                </div>
                <div className="bg-white rounded border border-gray-200 p-4">
                  <div className="text-xs text-gray-600">On Demand</div>
                  <div className="mt-2 text-lg font-semibold">{invQ.data.on_demand_items}</div>
                </div>
                <div className="bg-white rounded border border-gray-200 p-4">
                  <div className="text-xs text-gray-600">Low Stock</div>
                  <div className="mt-2 text-lg font-semibold">{invQ.data.low_stock_items}</div>
                </div>
              </div>
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Name</th>
                      <th className="text-left font-medium px-4 py-3">Category</th>
                      <th className="text-left font-medium px-4 py-3">Unit</th>
                      <th className="text-right font-medium px-4 py-3">Price</th>
                      <th className="text-left font-medium px-4 py-3">Type</th>
                      <th className="text-right font-medium px-4 py-3">Stock</th>
                      <th className="text-right font-medium px-4 py-3">Reorder Level</th>
                      <th className="text-left font-medium px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invQ.data.items.map((i) => (
                      <tr key={i.name} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{i.name}</td>
                        <td className="px-4 py-3">{i.category ?? "-"}</td>
                        <td className="px-4 py-3">{i.unit}</td>
                        <td className="px-4 py-3 text-right">{i.price}</td>
                        <td className="px-4 py-3">
                          {i.track_stock ? (
                            <span className="inline-flex px-2 py-1 rounded text-xs bg-blue-50 text-primary-600">Stocked</span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">On Demand</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{i.track_stock ? i.stock_quantity : "-"}</td>
                        <td className="px-4 py-3 text-right">{i.track_stock ? i.reorder_level : "-"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={i.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : null}

        {tab === "payments" ? (
          payQ.isLoading ? (
            <div className="bg-white rounded border border-gray-200 p-6 text-sm text-gray-600">Loading…</div>
          ) : payQ.isError ? (
            <div className="bg-white rounded border border-gray-200 p-6 text-sm text-red-600">Failed to load payments report</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 no-print">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded border border-gray-200 p-4">
                  <div className="text-xs text-gray-600">Total Received</div>
                  <div className="mt-2 text-lg font-semibold">{payQ.data.summary.total_received}</div>
                </div>
                <div className="bg-white rounded border border-gray-200 p-4">
                  <div className="text-xs text-gray-600">Cash</div>
                  <div className="mt-2 text-lg font-semibold">{payQ.data.summary.by_method.cash}</div>
                </div>
                <div className="bg-white rounded border border-gray-200 p-4">
                  <div className="text-xs text-gray-600">Bank Transfer</div>
                  <div className="mt-2 text-lg font-semibold">{payQ.data.summary.by_method.bank_transfer}</div>
                </div>
                <div className="bg-white rounded border border-gray-200 p-4">
                  <div className="text-xs text-gray-600">Cheque</div>
                  <div className="mt-2 text-lg font-semibold">{payQ.data.summary.by_method.cheque}</div>
                </div>
              </div>

              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Date</th>
                      <th className="text-left font-medium px-4 py-3">Client</th>
                      <th className="text-left font-medium px-4 py-3">Invoice #</th>
                      <th className="text-right font-medium px-4 py-3">Amount</th>
                      <th className="text-left font-medium px-4 py-3">Method</th>
                      <th className="text-left font-medium px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payQ.data.payments.map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{p.date}</td>
                        <td className="px-4 py-3">{p.client_name ?? "-"}</td>
                        <td className="px-4 py-3">{p.invoice_number ?? "-"}</td>
                        <td className="px-4 py-3 text-right">{p.amount}</td>
                        <td className="px-4 py-3">{p.method}</td>
                        <td className="px-4 py-3">{p.notes ?? "-"}</td>
                      </tr>
                    ))}
                    {payQ.data.payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-600">
                          No payments
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : null}
      </div>
    </div>
  );
}

