import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

import { getPurchase, receivePurchase, listPayments } from "../api/purchases";
import { getSupplier } from "../api/suppliers";
import { listItems } from "../api/inventory";
import SupplierPaymentModal from "../components/SupplierPaymentModal";

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { data: po, isLoading: isLoadingPo } = useQuery({
    queryKey: ["purchase", id],
    queryFn: () => getPurchase(id),
  });

  const { data: supplier } = useQuery({
    queryKey: ["supplier", po?.supplier_id],
    queryFn: () => getSupplier(po.supplier_id),
    enabled: !!po?.supplier_id,
  });
  
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => listItems(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", id],
    queryFn: () => listPayments(id),
  });

  const receiveMutation = useMutation({
    mutationFn: receivePurchase,
    onSuccess: () => {
      toast.success("Purchase order marked as received");
      queryClient.invalidateQueries({ queryKey: ["purchase", id] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to receive order");
    }
  });

  if (isLoadingPo) return <div className="p-6">Loading...</div>;
  if (!po) return <div className="p-6">Purchase order not found.</div>;

  const balanceDue = po.total - po.amount_paid;

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link to="/purchases" className="text-app-text-tertiary hover:text-brand transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{po.purchase_number}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider
            ${po.status === "pending" ? "bg-gray-100 text-gray-700" :
              po.status === "received" ? "bg-blue-100 text-blue-700" :
              po.status === "partially_paid" ? "bg-amber-100 text-amber-700" :
              "bg-emerald-100 text-emerald-700"}`}
          >
            {po.status.replace("_", " ")}
          </span>
        </div>
        
        <div className="flex gap-3">
          {po.status === "pending" && (
            <button 
              className="ui-btn-primary flex items-center gap-2"
              onClick={() => {
                if(confirm("Are you sure you want to mark this as received? Stock quantities will be updated.")) {
                  receiveMutation.mutate(id);
                }
              }}
              disabled={receiveMutation.isPending}
            >
              <CheckCircle className="w-4 h-4" />
              Mark as Received
            </button>
          )}
          
          {(po.status === "received" || po.status === "partially_paid") && (
            <button 
              className="ui-btn-primary flex items-center gap-2"
              onClick={() => setIsPaymentModalOpen(true)}
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card">
            <div className="px-5 py-4 border-b border-app-border">
              <h2 className="text-lg font-semibold">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-app-bg/50 border-b border-app-border">
                    <th className="px-5 py-3 font-medium text-app-text-secondary">Item</th>
                    <th className="px-5 py-3 font-medium text-app-text-secondary">Quantity</th>
                    <th className="px-5 py-3 font-medium text-app-text-secondary">Unit Cost</th>
                    <th className="px-5 py-3 font-medium text-app-text-secondary text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {po.items?.map(item => {
                    const itemName = inventoryItems.find(i => i.id === item.item_id)?.name || "Unknown";
                    return (
                      <tr key={item.id}>
                        <td className="px-5 py-3 font-medium">{itemName}</td>
                        <td className="px-5 py-3">{item.quantity}</td>
                        <td className="px-5 py-3">₹{item.unit_cost}</td>
                        <td className="px-5 py-3 text-right font-medium">₹{item.line_total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {payments.length > 0 && (
            <div className="ui-card">
              <div className="px-5 py-4 border-b border-app-border">
                <h2 className="text-lg font-semibold">Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-app-bg/50 border-b border-app-border">
                      <th className="px-5 py-3 font-medium text-app-text-secondary">Date</th>
                      <th className="px-5 py-3 font-medium text-app-text-secondary">Method</th>
                      <th className="px-5 py-3 font-medium text-app-text-secondary">Amount</th>
                      <th className="px-5 py-3 font-medium text-app-text-secondary">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {payments.map(payment => (
                      <tr key={payment.id}>
                        <td className="px-5 py-3">{payment.payment_date}</td>
                        <td className="px-5 py-3 capitalize">{payment.method.replace("_", " ")}</td>
                        <td className="px-5 py-3 font-medium">₹{payment.amount}</td>
                        <td className="px-5 py-3 text-app-text-secondary">{payment.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-5 space-y-4">
            <h2 className="text-lg font-semibold border-b border-app-border pb-3">Purchase Info</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="block text-app-text-tertiary">Supplier</span>
                <Link to={`/suppliers/${supplier?.id}`} className="font-medium text-brand hover:underline">{supplier?.name || "Loading..."}</Link>
              </div>
              <div>
                <span className="block text-app-text-tertiary">Date</span>
                <span className="font-medium">{po.purchase_date}</span>
              </div>
              <div>
                <span className="block text-app-text-tertiary">Due Date</span>
                <span className="font-medium">{po.due_date || "-"}</span>
              </div>
              {po.notes && (
                <div>
                  <span className="block text-app-text-tertiary">Notes</span>
                  <span className="font-medium">{po.notes}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="ui-card p-5 bg-emerald-50 border-emerald-100">
            <h2 className="text-lg font-semibold text-emerald-900 mb-4 border-b border-emerald-200 pb-3">Summary</h2>
            <div className="space-y-2 text-sm text-emerald-800 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{po.subtotal}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Amount Paid</span>
                <span>₹{po.amount_paid}</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-lg font-bold text-emerald-900 pt-3 border-t border-emerald-200">
              <span>Balance Due</span>
              <span>₹{balanceDue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <SupplierPaymentModal 
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        purchaseId={id}
        maxAmount={balanceDue}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase", id] });
          queryClient.invalidateQueries({ queryKey: ["payments", id] });
        }}
      />
    </div>
  );
}
