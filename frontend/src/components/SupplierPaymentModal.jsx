import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { recordPayment } from "../api/purchases";

export default function SupplierPaymentModal({ open, onClose, purchaseId, maxAmount, onSuccess }) {
  const [formData, setFormData] = useState({
    amount: maxAmount || 0,
    method: "bank_transfer",
    payment_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.amount <= 0 || formData.amount > maxAmount) {
      toast.error(`Amount must be between greater than 0 and less than or equal to ${maxAmount}`);
      return;
    }
    
    try {
      await recordPayment(purchaseId, formData);
      toast.success("Payment recorded");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error recording payment");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md ui-card overflow-hidden">
        <div className="px-5 py-4 border-b border-app-border flex justify-between items-center">
          <h2 className="text-lg font-semibold">Record Payment</h2>
          <button type="button" onClick={onClose} className="text-app-text-tertiary hover:text-app-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹) <span className="text-red-500">*</span></label>
            <input 
              type="number" 
              name="amount" 
              value={formData.amount} 
              onChange={handleChange} 
              className="ui-input w-full" 
              min="0.01" 
              max={maxAmount} 
              step="0.01" 
              required 
            />
            <p className="text-xs text-app-text-tertiary mt-1">Maximum: ₹{maxAmount}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Payment Date <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              name="payment_date" 
              value={formData.payment_date} 
              onChange={handleChange} 
              className="ui-input w-full" 
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Method <span className="text-red-500">*</span></label>
            <select 
              name="method" 
              value={formData.method} 
              onChange={handleChange} 
              className="ui-input w-full" 
              required
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleChange} 
              className="ui-input w-full" 
              rows={2}
            ></textarea>
          </div>
          
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-app-border">
            <button type="button" onClick={onClose} className="ui-btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" className="ui-btn-primary px-4 py-2">Record Payment</button>
          </div>
        </form>
      </div>
    </div>
  );
}
