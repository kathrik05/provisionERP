import { CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useConfirmSalesOrder, useSalesOrder } from "../hooks/useSales";
import { useGenerateInvoice } from "../hooks/useInvoices";
import GenerateInvoiceModal from "../components/GenerateInvoiceModal.jsx";
import { useState } from "react";

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

export default function SalesOrderViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const q = useSalesOrder(id);
  const confirmMut = useConfirmSalesOrder();
  const genMut = useGenerateInvoice();
  const [genOpen, setGenOpen] = useState(false);

  const o = q.data;

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold">
            {o ? `Order #${o.order_number}` : "Order"}
          </h1>
          {o ? <StatusBadge status={o.status} /> : null}
        </div>
        {o?.status === "draft" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => nav(`/sales/${id}/edit`)}
              className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => confirmMut.mutate(id)}
              disabled={confirmMut.isPending}
              className="text-sm px-3 py-2 rounded bg-primary-600 text-white hover:opacity-95 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Order
            </button>
          </div>
        ) : o?.status === "confirmed" ? (
          <button
            type="button"
            onClick={() => setGenOpen(true)}
            className="text-sm px-3 py-2 rounded bg-primary-600 text-white hover:opacity-95 disabled:opacity-50"
            disabled={genMut.isPending}
          >
            Generate Invoice
          </button>
        ) : null}
      </header>

      <div className="p-6 space-y-4">
        {q.isLoading ? (
          <div className="bg-white rounded border border-gray-200 p-6 text-sm text-gray-600">
            Loading…
          </div>
        ) : q.isError ? (
          <div className="bg-white rounded border border-gray-200 p-6 text-sm text-red-600">
            Failed to load order
          </div>
        ) : !o ? (
          <div className="bg-white rounded border border-gray-200 p-6 text-sm text-gray-600">
            Not found
          </div>
        ) : (
          <>
            <div className="bg-white rounded border border-gray-200 p-5 space-y-2">
              <div className="text-sm font-semibold">Order Details</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-600">Client</div>
                  <div>{o.client?.name ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Order Date</div>
                  <div>{o.order_date}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-600">Notes</div>
                  <div className="text-gray-800">{o.notes || "-"}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Item</th>
                    <th className="text-left font-medium px-4 py-3">Unit</th>
                    <th className="text-right font-medium px-4 py-3">Unit Price</th>
                    <th className="text-right font-medium px-4 py-3">Qty</th>
                    <th className="text-right font-medium px-4 py-3">Line Total</th>
                    <th className="text-right font-medium px-4 py-3">Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(o.items || []).map((li) => (
                    <tr key={li.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{li.item?.name ?? li.item_id}</td>
                      <td className="px-4 py-3">{li.item?.unit ?? "-"}</td>
                      <td className="px-4 py-3 text-right">{li.unit_price}</td>
                      <td className="px-4 py-3 text-right">{li.quantity}</td>
                      <td className="px-4 py-3 text-right">{li.line_total}</td>
                      <td className="px-4 py-3 text-right">{li.tax_amount ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded border border-gray-200 p-5 w-full max-w-md ml-auto space-y-2">
              <div className="text-sm font-semibold">Summary</div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{o.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span>{o.tax_amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {o.extra_charge_label || "Extra Charge"}
                </span>
                <span>{o.extra_charge ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{o.total}</span>
              </div>
            </div>
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
