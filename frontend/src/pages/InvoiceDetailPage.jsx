import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useParams } from "react-router-dom";
import { useInvoice, useInvoicePayments, useRecordPayment } from "../hooks/useInvoices";
import RecordPaymentModal from "../components/RecordPaymentModal.jsx";

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

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const q = useInvoice(id);
  const paymentsQuery = useInvoicePayments(id);
  const recordMut = useRecordPayment();

  const inv = q.data;
  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const [payOpen, setPayOpen] = useState(false);

  const remaining = useMemo(() => {
    if (!inv) return 0;
    return Number(inv.amount_due) - Number(inv.amount_paid);
  }, [inv]);

  async function record(payload) {
    await recordMut.mutateAsync({ invoiceId: id, payload });
    setPayOpen(false);
  }

  const pdfUrl = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/invoices/${id}/pdf`;

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-base font-semibold">{inv ? inv.invoice_number : "Invoice"}</h1>
        <button
          type="button"
          onClick={() => window.open(pdfUrl, "_blank")}
          className="bg-primary-600 text-white text-sm px-3 py-2 rounded hover:opacity-95"
        >
          Download PDF
        </button>
      </header>

      <div className="p-6 space-y-4">
        {q.isLoading ? (
          <div className="bg-white rounded border border-gray-200 p-6 text-sm text-gray-600">Loading…</div>
        ) : q.isError ? (
          <div className="bg-white rounded border border-gray-200 p-6 text-sm text-red-600">Failed to load invoice</div>
        ) : !inv ? (
          <div className="bg-white rounded border border-gray-200 p-6 text-sm text-gray-600">Not found</div>
        ) : (
          <>
            <div className="bg-white rounded border border-gray-200 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Invoice Info</div>
                <StatusBadge status={inv.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-600">Client</div>
                  <div>{inv.client?.name ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Order #</div>
                  <div>{inv.order?.order_number ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Invoice Date</div>
                  <div>{inv.invoice_date}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Due Date</div>
                  <div>{inv.due_date}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded border border-gray-200 p-5 space-y-2">
              <div className="text-sm font-semibold">Summary</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-600">Amount Due</div>
                <div className="text-right">{inv.amount_due}</div>
                <div className="text-gray-600">Amount Paid</div>
                <div className="text-right">{inv.amount_paid}</div>
                <div className="text-gray-600 font-semibold">Balance Due</div>
                <div className="text-right font-semibold">{remaining}</div>
              </div>
            </div>

            <div className="bg-white rounded border border-gray-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Payment History</div>
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  disabled={inv.status === "paid"}
                >
                  Record Payment
                </button>
              </div>
              <div className="overflow-hidden border border-gray-200 rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Date</th>
                      <th className="text-left font-medium px-4 py-3">Method</th>
                      <th className="text-right font-medium px-4 py-3">Amount</th>
                      <th className="text-left font-medium px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsQuery.isLoading ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-gray-600" colSpan={4}>
                          Loading…
                        </td>
                      </tr>
                    ) : paymentsQuery.isError ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-red-600" colSpan={4}>
                          Failed to load payments
                        </td>
                      </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-gray-600" colSpan={4}>
                          No payments yet
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{p.payment_date}</td>
                          <td className="px-4 py-3">{p.method}</td>
                          <td className="px-4 py-3 text-right">{p.amount}</td>
                          <td className="px-4 py-3">{p.notes ?? "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <RecordPaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onRecord={record}
        pending={recordMut.isPending}
        remaining={remaining}
      />
    </div>
  );
}

