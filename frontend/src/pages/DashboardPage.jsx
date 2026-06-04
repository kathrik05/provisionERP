import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import QuickOrderModal from "../components/QuickOrderModal";
import { useDashboard } from "../hooks/useReports";
import ChartContainer from "../ui/ChartContainer.jsx";
import DataTable from "../ui/DataTable.jsx";
import PillButton from "../ui/PillButton.jsx";
import StatsCard from "../ui/StatsCard.jsx";
import TopNavbar from "../ui/TopNavbar.jsx";
import TableRowCard from "../ui/TableRowCard.jsx";
import StatusPill from "../ui/StatusPill.jsx";

export default function DashboardPage() {
  const nav = useNavigate();
  const q = useDashboard();
  const data = q.data;
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }, []);

  const pieData = useMemo(() => {
    const rows = data?.invoice_status_breakdown ?? [];
    return rows.map((r) => ({ name: r.status, value: r.count }));
  }, [data?.invoice_status_breakdown]);

  const pieColors = {
    unpaid: "#ef4444",
    partially_paid: "#f59e0b",
    paid: "#22c55e",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopNavbar
        title="Dashboard"
        right={
          <>
            <div className="hidden sm:block text-sm text-app-text-secondary">
              {todayLabel}
            </div>
            <PillButton onClick={() => setQuickOrderOpen(true)}>
              + Quick New Order
            </PillButton>
          </>
        }
      />

      <QuickOrderModal
        open={quickOrderOpen}
        onClose={() => {
          setQuickOrderOpen(false);
          q.refetch();
        }}
      />

      <div className="ui-page">
        {q.isLoading ? (
          <div className="ui-card p-6 text-sm text-app-text-secondary">
            Loading…
          </div>
        ) : q.isError ? (
          <div className="ui-card p-6 text-sm text-red-600">
            Failed to load dashboard
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatsCard
                title="Sales This Month"
                value={data.total_sales_this_month}
                accentClassName="text-brand"
                onClick={() => nav("/invoices")}
              />
              <StatsCard
                title="Outstanding"
                value={data.total_outstanding}
                accentClassName="text-amber-700"
                onClick={() => nav("/reports?tab=outstanding")}
              />
              <StatsCard
                title="Low Stock Items"
                value={data.low_stock_count}
                accentClassName="text-red-600"
                onClick={() => nav("/inventory?low_stock=true")}
              />
              <StatsCard
                title="Overdue Invoices"
                value={data.overdue_invoices_count}
                accentClassName="text-red-600"
                onClick={() => nav("/invoices?status=overdue")}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <ChartContainer title="Monthly Sales" subtitle="Last 12 months">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthly_sales}>
                        <CartesianGrid
                          vertical={false}
                          stroke="rgba(30,30,30,0.08)"
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 12, fill: "#6B7280" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#6B7280" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(11,107,97,0.06)" }}
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid #E8ECE9",
                            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Bar
                          dataKey="total"
                          fill="#0B6B61"
                          radius={[12, 12, 12, 12]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartContainer>
              </div>

              <div className="lg:col-span-2">
                <ChartContainer title="Invoice Status" subtitle="Distribution">
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
                            <Cell
                              key={entry.name}
                              fill={pieColors[entry.name] ?? "#94a3b8"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid #E8ECE9",
                            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center text-sm text-app-text-secondary">
                    Total: {pieData.reduce((s, r) => s + r.value, 0)}
                  </div>
                </ChartContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DataTable
                title="Recent Orders"
                gridCols="sm:grid-cols-4"
                right={
                  <PillButton variant="ghost" onClick={() => nav("/sales")}>
                    View All
                  </PillButton>
                }
                columns={[
                  { key: "order", header: "Order #" },
                  { key: "client", header: "Client" },
                  { key: "total", header: "Total", align: "right" },
                  { key: "status", header: "Status" },
                ]}
                rows={data.recent_orders ?? []}
                empty="No recent orders"
                renderRow={(o) => (
                  <TableRowCard key={o.id}>
                    <div className="font-semibold text-[#111] truncate">{o.order_number}</div>
                    <div className="text-sm text-gray-500 truncate">{o.client_name ?? "-"}</div>
                    <div className="text-right whitespace-nowrap text-[#111] font-semibold">{o.total}</div>
                    <div><StatusPill status={o.status} /></div>
                  </TableRowCard>
                )}
              />

              <DataTable
                title="Recent Invoices"
                gridCols="sm:grid-cols-4"
                right={
                  <PillButton variant="ghost" onClick={() => nav("/invoices")}>
                    View All
                  </PillButton>
                }
                columns={[
                  { key: "invoice", header: "Invoice #" },
                  { key: "client", header: "Client" },
                  { key: "due", header: "Amount Due", align: "right" },
                  { key: "status", header: "Status" },
                ]}
                rows={data.recent_invoices ?? []}
                empty="No recent invoices"
                renderRow={(inv) => (
                  <TableRowCard key={inv.id}>
                    <div className="font-semibold text-[#111] truncate">{inv.invoice_number}</div>
                    <div className="text-sm text-gray-500 truncate">{inv.client_name ?? "-"}</div>
                    <div className="text-right whitespace-nowrap text-[#111] font-semibold">{inv.amount_due}</div>
                    <div><StatusPill status={inv.status} /></div>
                  </TableRowCard>
                )}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

