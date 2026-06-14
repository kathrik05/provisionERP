import { useState, useEffect } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { createSupplier, updateSupplier } from "../api/suppliers";

export default function SupplierFormModal({ open, onClose, supplier, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    credit_limit: 0,
    credit_days: 0,
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || "",
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        credit_limit: supplier.credit_limit || 0,
        credit_days: supplier.credit_days || 0,
      });
    } else {
      setFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        credit_limit: 0,
        credit_days: 0,
      });
    }
  }, [supplier, open]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }
    
    try {
      if (supplier?.id) {
        await updateSupplier(supplier.id, formData);
        toast.success("Supplier updated");
      } else {
        await createSupplier(formData);
        toast.success("Supplier created");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error saving supplier");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg ui-card overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-app-border flex justify-between items-center">
          <h2 className="text-lg font-semibold">{supplier ? "Edit Supplier" : "Add Supplier"}</h2>
          <button type="button" onClick={onClose} className="text-app-text-tertiary hover:text-app-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="ui-input w-full" required />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1">Contact Person</label>
              <input type="text" name="contact_person" value={formData.contact_person} onChange={handleChange} className="ui-input w-full" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="ui-input w-full" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="ui-input w-full" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1">Credit Limit (₹)</label>
              <input type="number" name="credit_limit" value={formData.credit_limit} onChange={handleChange} className="ui-input w-full" min="0" step="0.01" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1">Credit Days</label>
              <input type="number" name="credit_days" value={formData.credit_days} onChange={handleChange} className="ui-input w-full" min="0" step="1" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} className="ui-input w-full" rows={3}></textarea>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="ui-btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" className="ui-btn-primary px-4 py-2">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
