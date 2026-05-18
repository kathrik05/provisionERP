import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboard } from "../hooks/useReports";
import QuickOrderModal from "../components/QuickOrderModal";

function StatCard({ title, value, accent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white rounded border border-gray-200 p-4 hover:bg-gray-50"
    >
      <div className="text-xs text-gray-600">{title}</div>
      <div className={["mt-2 text-lg font-semibold", accent].join(" ")}>{value}</div>
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    draft: "bg-gray-100 text-gray-700",
    confirmed: "bg-blue-50 text-primary-600",
    invoiced: "bg-amber-50 text-amber-700",
    paid: "bg-green-50 text-green-700",
    unpaid: "bg-red-50 text-red-700",
    partially_paid: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={["inline-flex px-2 py-1 rounded text-xs", styles[status] ?? "bg-gray-100 text-gray-700"].join(" ")}>
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const nav = useNavigate();
  const q = useDashboard();
  const data = q.data;
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }, []);

  const pieData = useMemo(() => {
    const rows = data?.invoice_status_breakdown ?? [];
    return rows.map((r) => ({ name: r.status, value: r.count }));
  }, [data?.invoice_status_breakdown]);

  const pieColors = { unpaid: "#ef4444", partially_paid: "#f59e0b", paid: "#22c55e" };

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 no-print">
        <h1 className="text-base font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">{todayLabel}</div>
          <button 
            onClick={() => setQuickOrderOpen(true)}
            className="text-sm bg-primary-600 text-white px-3 py-1.5 rounded hover:bg-primary-700 font-medium shadow-sm transition-colors"
          >
            + Quick New Order
          </button>
        </div>
      </header>
      
      <QuickOrderModal open={quickOrderOpen} onClose={() => { setQuickOrderOpen(false); q.refetch(); }} />

      <div className="p-6 space-y-4">
        {q.isLoading ? (
          <div className="bg-white rounded border border-gray-200 p-6 text-sm text-gray-600">Loading…</div>
        ) : q.isError ? (
          <div className="bg-white rounded border border-gray-200 p-6 text-sm text-red-600">Failed to load dashboard</div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                title="Sales This Month"
                value={data.total_sales_this_month}
                accent="text-primary-600"
                onClick={() => nav("/invoices")}
              />
              <StatCard
                title="Outstanding"
                value={data.total_outstanding}
                accent="text-amber-700"
                onClick={() => nav("/reports?tab=outstanding")}
              />
              <StatCard
                title="Low Stock Items"
                value={data.low_stock_count}
                accent="text-red-600"
                onClick={() => nav("/inventory?low_stock=true")}
              />
              <StatCard
                title="Overdue Invoices"
                value={data.overdue_invoices_count}
                accent="text-red-600"
                onClick={() => nav("/invoices?status=overdue")}
              />
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3 bg-white rounded border border-gray-200 p-4">
                <div className="text-sm font-semibold mb-2">Monthly Sales</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthly_sales}>
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="col-span-2 bg-white rounded border border-gray-200 p-4">
                <div className="text-sm font-semibold mb-2">Invoice Status</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={pieColors[entry.name] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center text-sm text-gray-700">
                  Total: {pieData.reduce((s, r) => s + r.value, 0)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <div className="text-sm font-semibold">Recent Orders</div>
                  <button type="button" className="text-sm text-primary-600" onClick={() => nav("/sales")}>
                    View All
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Order #</th>
                      <th className="text-left font-medium px-4 py-3">Client</th>
                      <th className="text-right font-medium px-4 py-3">Total</th>
                      <th className="text-left font-medium px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recent_orders ?? []).map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{o.order_number}</td>
                        <td className="px-4 py-3">{o.client_name ?? "-"}</td>
                        <td className="px-4 py-3 text-right">{o.total}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={o.status} />
                        </td>
                      </tr>
                    ))}
                    {(data.recent_orders ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-600">
                          No recent orders
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <div className="text-sm font-semibold">Recent Invoices</div>
                  <button type="button" className="text-sm text-primary-600" onClick={() => nav("/invoices")}>
                    View All
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Invoice #</th>
                      <th className="text-left font-medium px-4 py-3">Client</th>
                      <th className="text-right font-medium px-4 py-3">Amount Due</th>
                      <th className="text-left font-medium px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recent_invoices ?? []).map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{inv.invoice_number}</td>
                        <td className="px-4 py-3">{inv.client_name ?? "-"}</td>
                        <td className="px-4 py-3 text-right">{inv.amount_due}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={inv.status} />
                        </td>
                      </tr>
                    ))}
                    {(data.recent_invoices ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-600">
                          No recent invoices
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

