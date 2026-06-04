import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import GenerateInvoiceModal from "../components/GenerateInvoiceModal.jsx";
import { useGenerateInvoice } from "../hooks/useInvoices";
import { useConfirmSalesOrder, useSalesOrder } from "../hooks/useSales";
import DashboardCard from "../ui/DashboardCard.jsx";
import DataTable from "../ui/DataTable.jsx";
import PillButton from "../ui/PillButton.jsx";
import TopNavbar from "../ui/TopNavbar.jsx";

import TableRowCard from "../ui/TableRowCard.jsx";
import StatusPill from "../ui/StatusPill.jsx";

export default function SalesOrderViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const q = useSalesOrder(id);
  const confirmMut = useConfirmSalesOrder();
  const genMut = useGenerateInvoice();
  const [genOpen, setGenOpen] = useState(false);

  const o = q.data;

  return (
    <div className="min-h-screen flex flex-col">
      <TopNavbar
        title={o ? `Order #${o.order_number}` : "Order"}
        right={
          <div className="flex items-center gap-2">
            {o ? <StatusPill status={o.status} /> : null}
            {o?.status === "draft" ? (
              <>
                <PillButton
                  variant="secondary"
                  onClick={() => nav(`/sales/${id}/edit`)}
                >
                  Edit
                </PillButton>
                <PillButton
                  onClick={() => confirmMut.mutate(id)}
                  disabled={confirmMut.isPending}
                >
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Order
                  </span>
                </PillButton>
              </>
            ) : o?.status === "confirmed" ? (
              <PillButton
                onClick={() => setGenOpen(true)}
                disabled={genMut.isPending}
              >
                Generate Invoice
              </PillButton>
            ) : null}
          </div>
        }
      />

      <div className="ui-page">
        {q.isLoading ? (
          <div className="ui-card p-6 text-sm text-app-text-secondary">
            Loading…
          </div>
        ) : q.isError ? (
          <div className="ui-card p-6 text-sm text-red-600">
            Failed to load order
          </div>
        ) : !o ? (
          <div className="ui-card p-6 text-sm text-app-text-secondary">
            Not found
          </div>
        ) : (
          <>
            <DashboardCard className="p-6">
              <div className="text-sm font-semibold tracking-tight">
                Order Details
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-app-text-secondary">Client</div>
                  <div className="mt-1">{o.client?.name ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-app-text-secondary">Order Date</div>
                  <div className="mt-1">{o.order_date}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs text-app-text-secondary">Notes</div>
                  <div className="mt-1 text-app-text-primary">
                    {o.notes || "-"}
                  </div>
                </div>
              </div>
            </DashboardCard>

            <DataTable
              title="Line Items"
              gridCols="sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr]"
              columns={[
                { key: "item", header: "Item" },
                { key: "unit", header: "Unit" },
                { key: "unit_price", header: "Unit Price", align: "right" },
                { key: "qty", header: "Qty", align: "right" },
                { key: "line_total", header: "Line Total", align: "right" },
                { key: "tax", header: "Tax Amount", align: "right" },
              ]}
              rows={o.items || []}
              empty="No items"
              renderRow={(li) => (
                <TableRowCard key={li.id}>
                  <div className="font-semibold text-[#111] truncate">{li.item?.name ?? li.item_id}</div>
                  <div className="text-sm text-gray-500 whitespace-nowrap">
                    {li.item?.unit ?? "-"}
                  </div>
                  <div className="text-sm text-gray-600 text-right whitespace-nowrap">
                    {li.unit_price}
                  </div>
                  <div className="text-sm text-gray-600 text-right whitespace-nowrap">
                    {li.quantity}
                  </div>
                  <div className="text-right whitespace-nowrap font-semibold text-[#111]">
                    {li.line_total}
                  </div>
                  <div className="text-sm text-gray-600 text-right whitespace-nowrap">
                    {li.tax_amount ?? 0}
                  </div>
                </TableRowCard>
              )}
            />

            <DashboardCard className="p-6 w-full max-w-md ml-auto">
              <div className="text-sm font-semibold tracking-tight">Summary</div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-app-text-secondary">Subtotal</span>
                  <span>{o.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-app-text-secondary">Tax</span>
                  <span>{o.tax_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-app-text-secondary">
                    {o.extra_charge_label || "Extra Charge"}
                  </span>
                  <span>{o.extra_charge ?? 0}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{o.total}</span>
                </div>
              </div>
            </DashboardCard>
          </>
        )}
      </div>

      <GenerateInvoiceModal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        pending={genMut.isPending}
        onGenerate={async (payload) => {
          const out = await genMut.mutateAsync({ orderId: id, payload });
          setGenOpen(false);
          nav(`/invoices/${out.id}`);
        }}
      />
    </div>
  );
}

