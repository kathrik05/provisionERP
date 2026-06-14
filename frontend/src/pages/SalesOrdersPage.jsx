import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Pencil, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConfirmSalesOrder, useSalesOrders } from "../hooks/useSales";
import DataTable from "../ui/DataTable.jsx";
import PillButton from "../ui/PillButton.jsx";
import TopNavbar from "../ui/TopNavbar.jsx";

import TableRowCard from "../ui/TableRowCard.jsx";
import StatusPill from "../ui/StatusPill.jsx";
import EmptyState from "../ui/EmptyState.jsx";

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
    <div className="min-h-screen flex flex-col">
      <TopNavbar
        title="Sales Orders"
        right={
          <PillButton onClick={() => nav("/sales/new")}>New Order</PillButton>
        }
      />

      <div className="ui-page">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by order # or client…"
            className="w-full"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <DataTable
          title="Orders"
          gridCols="sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr_1fr_1fr_120px]"
          columns={[
            { key: "order_number", header: "Order #" },
            { key: "client", header: "Client" },
            { key: "date", header: "Date" },
            { key: "items", header: "Items", align: "right" },
            { key: "subtotal", header: "Subtotal", align: "right" },
            { key: "total", header: "Total", align: "right" },
            { key: "status", header: "Status" },
            { key: "actions", header: "Actions", align: "right" },
          ]}
          rows={listQuery.isLoading || listQuery.isError ? [] : rows}
          empty={
            listQuery.isLoading ? (
              "Loading…"
            ) : listQuery.isError ? (
              "Failed to load orders"
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title="No orders found"
                description="Get started by creating a new sales order."
                actionLabel="New Order"
                onAction={() => nav("/sales/new")}
              />
            )
          }
          renderRow={(o) => (
            <TableRowCard key={o.id}>
              <div className="font-semibold text-[#111] truncate">{o.order_number}</div>
              <div className="text-sm text-gray-500 truncate">{o.client?.name ?? "-"}</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">{o.order_date}</div>
              <div className="text-sm text-gray-600 text-right whitespace-nowrap">
                {o.items_count ?? 0}
              </div>
              <div className="text-sm text-gray-600 text-right whitespace-nowrap">
                {o.subtotal}
              </div>
              <div className="text-right whitespace-nowrap font-semibold text-[#111]">{o.total}</div>
              <div>
                <StatusPill status={o.status} />
              </div>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-brand hover:bg-[#F5F5F5] transition-colors"
                  onClick={() => nav(`/sales/${o.id}`)}
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {o.status === "draft" ? (
                  <>
                    <button
                      type="button"
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-brand hover:bg-[#F5F5F5] transition-colors"
                      onClick={() => nav(`/sales/${o.id}/edit`)}
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-brand hover:bg-[#F5F5F5] transition-colors disabled:opacity-50"
                      disabled={confirmMut.isPending}
                      onClick={() => confirmMut.mutate(o.id)}
                      title="Confirm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </>
                ) : null}
              </div>
            </TableRowCard>
          )}
        />
      </div>
    </div>
  );
}

