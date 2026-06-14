import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import toast from "react-hot-toast";

import { createPurchase, getPurchase, updatePurchase } from "../api/purchases";
import { useInventoryItems, useSuppliers } from "../hooks/usePurchases";
import SearchSelect from "../components/SearchSelect";

function ItemDropdown({ value, onChange }) {
  const [search, setSearch] = useState("");
  const { data: options = [], isLoading, isError } = useInventoryItems(search);
  
  const selectedItem = options.find(o => o.id === value?.item_id) || value?.selectedItem;
  
  if (!isLoading && !search && options.length === 0) {
    return <div className="text-sm text-red-500 py-2">No items found. Add items in Inventory module first.</div>;
  }
  
  return (
    <SearchSelect
      value={value?.item_id}
      displayValue={selectedItem ? selectedItem.name : "Select Item"}
      placeholder="Select Item"
      options={options}
      isLoading={isLoading}
      isError={isError}
      searchValue={search}
      onSearchChange={setSearch}
      getOptionLabel={(opt) => opt.name}
      getOptionValue={(opt) => opt.id}
      onChange={(opt) => onChange({ item_id: opt.id, selectedItem: opt })}
    />
  );
}

export default function PurchaseOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultSupplierId = searchParams.get("supplier_id");
  const queryClient = useQueryClient();

  const isEdit = Boolean(id);

  const { data: suppliers = [] } = useSuppliers();

  const { data: existingPo, isLoading: isLoadingPo } = useQuery({
    queryKey: ["purchase", id],
    queryFn: () => getPurchase(id),
    enabled: isEdit,
  });

  const [formData, setFormData] = useState({
    supplier_id: defaultSupplierId || "",
    purchase_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (existingPo) {
      setFormData({
        supplier_id: existingPo.supplier_id || "",
        purchase_date: existingPo.purchase_date || "",
        notes: existingPo.notes || "",
      });
      // Currently backend doesn't support updating items for PO, but we'd populate them here
      // For this extension, we'll only allow editing basic details if pending, 
      // but creating from scratch is the main focus for items.
    }
  }, [existingPo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleAddItem = () => {
    setItems([...items, { id: Math.random().toString(), item_id: "", unit: "", quantity: 1, unit_cost: "", selectedItem: null }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    
    if (field === "item_selection") {
      newItems[index].item_id = value.item_id;
      newItems[index].selectedItem = value.selectedItem;
      if (value.selectedItem && value.selectedItem.unit) {
        newItems[index].unit = value.selectedItem.unit;
      }
      // Unit Cost left blank for user to enter
    } else {
      newItems[index][field] = value;
    }
    
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_cost)), 0);

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updatePurchase(id, { purchase_date: data.purchase_date, notes: data.notes }) : createPurchase(data),
    onSuccess: () => {
      toast.success(isEdit ? "Purchase Order updated" : "Purchase Order created");
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      navigate("/purchases");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Error saving purchase order");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      toast.error("Please select a supplier");
      return;
    }
    
    if (!isEdit && items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    
    if (!isEdit && items.some(i => !i.item_id || i.quantity <= 0 || i.unit_cost <= 0)) {
      toast.error("Please fill all item details correctly");
      return;
    }

    const payload = {
      ...formData,
    };
    
    if (!isEdit) {
      payload.items = items.map(i => ({
        item_id: i.item_id,
        quantity: Number(i.quantity),
        unit_cost: Number(i.unit_cost)
      }));
    }

    mutation.mutate(payload);
  };

  if (isEdit && isLoadingPo) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-[1200px] mx-auto w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate(-1)} className="text-app-text-tertiary hover:text-brand transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">{isEdit ? `Edit PO: ${existingPo?.purchase_number}` : "New Purchase Order"}</h1>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(-1)} className="ui-btn-secondary px-4">Cancel</button>
            <button type="submit" className="ui-btn-primary px-4 flex items-center gap-2" disabled={mutation.isPending}>
              <Save className="w-4 h-4" />
              {mutation.isPending ? "Saving..." : "Save Order"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {!isEdit && (
              <div className="ui-card">
                <div className="px-5 py-4 border-b border-app-border">
                  <h2 className="text-lg font-semibold">Line Items</h2>
                </div>
                <div className="p-5">
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-app-text-secondary border-b border-app-border">
                          <th className="pb-2 font-medium">Item</th>
                          <th className="pb-2 font-medium w-24">Quantity</th>
                          <th className="pb-2 font-medium w-20">Unit</th>
                          <th className="pb-2 font-medium w-32">Unit Cost (₹)</th>
                          <th className="pb-2 font-medium w-24 text-right">Total</th>
                          <th className="pb-2 font-medium w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border/50">
                        {items.map((item, index) => (
                          <tr key={item.id}>
                            <td className="py-3 pr-2">
                              <ItemDropdown
                                value={{ item_id: item.item_id, selectedItem: item.selectedItem }}
                                onChange={(val) => handleItemChange(index, "item_selection", val)}
                              />
                            </td>
                            <td className="py-3 pr-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                className="ui-input w-full"
                                min="0.01" step="0.01" required
                              />
                            </td>
                            <td className="py-3 pr-2">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                                className="ui-input w-full bg-gray-50"
                                placeholder="Unit"
                                readOnly
                              />
                            </td>
                            <td className="py-3 pr-2">
                              <input
                                type="number"
                                value={item.unit_cost}
                                onChange={(e) => handleItemChange(index, "unit_cost", e.target.value)}
                                className="ui-input w-full"
                                min="0" step="0.01" required
                              />
                            </td>
                            <td className="py-3 pr-2 text-right font-medium">
                              ₹{(Number(item.quantity) * Number(item.unit_cost)).toFixed(2)}
                            </td>
                            <td className="py-3 text-right">
                              <button type="button" onClick={() => handleRemoveItem(index)} className="p-1.5 text-app-text-tertiary hover:text-red-600 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={handleAddItem} className="text-sm font-medium text-brand flex items-center gap-1 hover:underline">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
              </div>
            )}
            
            {isEdit && (
              <div className="ui-card p-5">
                <p className="text-app-text-secondary">Line items cannot be edited after creation in this version. Cancel the PO and create a new one if items need to change.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="ui-card p-5 space-y-4">
              <h2 className="text-lg font-semibold border-b border-app-border pb-3 mb-4">Order Details</h2>
              
              <div>
                <label className="block text-sm font-medium mb-1">Supplier <span className="text-red-500">*</span></label>
                <select
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleChange}
                  className="ui-input w-full"
                  disabled={isEdit}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleChange}
                  className="ui-input w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="ui-input w-full"
                  rows={4}
                ></textarea>
              </div>
            </div>

            {!isEdit && (
              <div className="ui-card p-5 bg-emerald-50 border-emerald-100">
                <h2 className="text-lg font-semibold text-emerald-900 mb-4">Summary</h2>
                <div className="flex justify-between items-center text-lg font-bold text-emerald-900 pt-3 border-t border-emerald-200">
                  <span>Total</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
