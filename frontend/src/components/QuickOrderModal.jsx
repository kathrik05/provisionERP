import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import SearchSelect from "./SearchSelect";
import { useClients, useCreateClient } from "../hooks/useClients";
import { useInventoryList, useCreateItem } from "../hooks/useInventory";
import { useCreateSalesOrder, useOverrideLineTax } from "../hooks/useSales";
import { useTaxRules } from "../hooks/useTaxes";

function money(n) {
  const x = Number(n ?? 0);
  if (Number.isNaN(x)) return "0.00";
  return x.toFixed(2);
}

function computeTotals(lines) {
  const subtotal = lines.reduce(
    (sum, li) => sum + Number(li.quantity || 0) * Number(li.unit_price || 0),
    0
  );
  const tax = lines.reduce((sum, li) => sum + Number(li.tax_amount || 0), 0);
  return { subtotal, tax };
}

export default function QuickOrderModal({ open, onClose }) {
  const [step, setStep] = useState(1); // 1: Client, 2: Items, 3: Summary

  // Client State
  const [client, setClient] = useState(null);
  const [clientSearch, setClientSearch] = useState("");
  const clientsQuery = useClients(clientSearch);
  const createClientMut = useCreateClient();
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: "", email: "", phone: "" });

  // Items State
  const [itemSearch, setItemSearch] = useState("");
  const inventoryQuery = useInventoryList({ search: itemSearch, lowStockOnly: false });
  const createItemMut = useCreateItem();
  const [lines, setLines] = useState([]);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [newItemData, setNewItemData] = useState({ name: "", category: "", price: "", unit: "pcs" });
  
  // Tax & Summary State
  const taxRulesQuery = useTaxRules({ active_only: true });
  const taxRules = useMemo(() => taxRulesQuery.data ?? [], [taxRulesQuery.data]);
  const createOrderMut = useCreateSalesOrder();
  const overrideTaxMut = useOverrideLineTax();

  const linesWithTax = useMemo(() => {
    return lines.map((li) => {
      const lineSubtotal = Number(li.quantity || 0) * Number(li.unit_price || 0);
      const rule = li.tax_id ? taxRules.find((r) => r.id === li.tax_id) : null;
      const rate = rule ? Number(rule.rate || 0) : 0;
      const tax_amount = (lineSubtotal * rate) / 100;
      return { ...li, lineSubtotal, tax_rate: rate, tax_amount };
    });
  }, [lines, taxRules]);

  const totals = useMemo(() => computeTotals(linesWithTax), [linesWithTax]);

  if (!open) return null;

  // -- Client Handlers --
  async function handleCreateClient() {
    if (!newClientData.name) {
      toast.error("Client name is required");
      return;
    }
    const created = await createClientMut.mutateAsync(newClientData);
    setClient({ id: created.id, name: created.name });
    setIsCreatingClient(false);
    setNewClientData({ name: "", email: "", phone: "" });
    setClientSearch("");
  }

  // -- Item Handlers --
  function addLine() {
    setLines((v) => [
      ...v,
      { item: null, unit: "", unit_price: "", quantity: "1", tax_id: null },
    ]);
  }

  function removeLine(idx) {
    setLines((v) => v.filter((_, i) => i !== idx));
  }

  function updateLine(idx, patch) {
    setLines((v) => v.map((li, i) => (i === idx ? { ...li, ...patch } : li)));
  }

  async function handleCreateItem() {
    if (!newItemData.name || !newItemData.price || !newItemData.unit) {
      toast.error("Name, price, and unit are required");
      return;
    }
    const payload = {
      ...newItemData,
      price: Number(newItemData.price),
      track_stock: false,
    };
    const created = await createItemMut.mutateAsync(payload);
    
    // Add to line items automatically
    setLines((v) => [
      ...v,
      { 
        item: { id: created.id, name: created.name, unit: created.unit, price: created.price, tax_id: null },
        unit: created.unit, 
        unit_price: String(created.price), 
        quantity: "1", 
        tax_id: null 
      },
    ]);
    
    setIsCreatingItem(false);
    setNewItemData({ name: "", category: "", price: "", unit: "pcs" });
    setItemSearch("");
  }

  // -- Submit Handler --
  async function handleConfirmOrder() {
    if (!client?.id) return;
    if (linesWithTax.length === 0 || !linesWithTax.some(l => l.item?.id)) {
      toast.error("Please add at least one item.");
      return;
    }

    const payload = {
      client_id: client.id,
      items: linesWithTax
        .filter((li) => li.item?.id)
        .map((li) => ({
          item_id: li.item.id,
          quantity: Number(li.quantity),
          unit_price: Number(li.unit_price),
        })),
    };

    const out = await createOrderMut.mutateAsync(payload);
    
    // Override taxes
    await Promise.all(
      linesWithTax
        .filter((li) => li.item?.id)
        .map((li) =>
          overrideTaxMut.mutateAsync({
            orderId: out.id,
            itemId: li.item.id,
            tax_id: li.tax_id || null,
          })
        )
    );
    
    toast.success("Order Created Successfully");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      {/* 40vw on large screens, up to 90vw on small screens */}
      <div className="relative w-full max-w-[90vw] lg:max-w-[40vw] bg-white rounded-lg border border-gray-200 shadow-xl flex flex-col max-h-full">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="text-base font-semibold">Quick New Order - Step {step} of 3</div>
          <button type="button" className="text-gray-400 hover:text-gray-700" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-auto shrink">
          
          {/* STEP 1: CLIENT */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700">Select or Add Client</div>
              
              {!isCreatingClient ? (
                <>
                  <SearchSelect
                    value={client?.id ?? ""}
                    displayValue={client?.name ?? ""}
                    placeholder="Search client…"
                    options={clientsQuery.data ?? []}
                    isLoading={clientsQuery.isLoading}
                    isError={clientsQuery.isError}
                    searchValue={clientSearch}
                    onSearchChange={setClientSearch}
                    getOptionLabel={(c) => c.name}
                    getOptionValue={(c) => c.id}
                    onChange={(c) => setClient({ id: c.id, name: c.name })}
                  />
                  <div className="text-center text-sm text-gray-500 my-2">OR</div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingClient(true)}
                    className="w-full py-2 border border-dashed border-app-border rounded-2xl text-sm text-app-text-secondary hover:bg-white hover:text-brand transition"
                  >
                    + Create New Client Inline
                  </button>
                </>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded space-y-3">
                  <div className="text-sm font-semibold">New Client</div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Name</label>
                    <input
                      value={newClientData.name}
                      onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Email (Optional)</label>
                      <input
                        value={newClientData.email}
                        onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Phone (Optional)</label>
                      <input
                        value={newClientData.phone}
                        onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingClient(false)}
                      className="text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateClient}
                      disabled={createClientMut.isPending}
                      className="text-xs px-3 py-1.5 rounded-full bg-brand text-white shadow-soft hover:bg-brand-dark disabled:opacity-50 transition"
                    >
                      {createClientMut.isPending ? "Saving..." : "Save Client"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ITEMS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-700">Add Line Items</div>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-brand font-medium hover:bg-emerald-100 transition"
                >
                  + Add Item Line
                </button>
              </div>

              {lines.length === 0 ? (
                <div className="p-6 border border-dashed border-gray-300 rounded text-center text-sm text-gray-500">
                  No items added yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {linesWithTax.map((li, idx) => (
                    <div key={idx} className="p-3 border border-gray-200 rounded bg-gray-50 flex flex-col gap-3">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex-1">
                           <SearchSelect
                            value={li.item?.id ?? ""}
                            displayValue={li.item?.name ?? ""}
                            placeholder="Select item…"
                            options={inventoryQuery.data ?? []}
                            isLoading={inventoryQuery.isLoading}
                            isError={inventoryQuery.isError}
                            searchValue={itemSearch}
                            onSearchChange={setItemSearch}
                            getOptionLabel={(i) => `${i.name}${i.category ? ` (${i.category})` : ""}`}
                            getOptionValue={(i) => i.id}
                            onChange={(i) =>
                              updateLine(idx, {
                                item: { id: i.id, name: i.name, unit: i.unit, price: i.price, tax_id: i.tax_id ?? null },
                                unit: i.unit,
                                unit_price: li.unit_price || String(i.price),
                                tax_id: i.tax_id ?? null,
                              })
                            }
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                         <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold block mb-1">Qty</label>
                            <input
                              value={li.quantity}
                              onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                            />
                         </div>
                         <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold block mb-1">Price</label>
                            <input
                              value={li.unit_price}
                              onChange={(e) => updateLine(idx, { unit_price: e.target.value })}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                            />
                         </div>
                         <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold block mb-1">Tax</label>
                            <select
                              value={li.tax_id || ""}
                              onChange={(e) =>
                                updateLine(idx, { tax_id: e.target.value ? e.target.value : null })
                              }
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="">No Tax</option>
                              {taxRules.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({r.rate}%)
                                </option>
                              ))}
                            </select>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isCreatingItem ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingItem(true)}
                  className="w-full py-2 mt-2 border border-dashed border-app-border rounded-2xl text-sm text-app-text-secondary hover:bg-white hover:text-brand transition"
                >
                  + Create New Item Inline
                </button>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded space-y-3 mt-4">
                  <div className="text-sm font-semibold">New Item</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Item Name</label>
                      <input
                        value={newItemData.name}
                        onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Category</label>
                      <input
                        value={newItemData.category}
                        onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Price</label>
                      <input
                        type="number"
                        value={newItemData.price}
                        onChange={(e) => setNewItemData({ ...newItemData, price: e.target.value })}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Unit</label>
                      <input
                        value={newItemData.unit}
                        onChange={(e) => setNewItemData({ ...newItemData, unit: e.target.value })}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingItem(false)}
                      className="text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateItem}
                      disabled={createItemMut.isPending}
                      className="text-xs px-3 py-1.5 rounded-full bg-brand text-white shadow-soft hover:bg-brand-dark disabled:opacity-50 transition"
                    >
                      {createItemMut.isPending ? "Saving..." : "Save Item"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SUMMARY */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-sm font-medium text-gray-700">Order Summary</div>
              
              <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="block text-xs text-gray-500 font-medium">Client</span>
                    <span className="font-semibold text-gray-900">{client?.name}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium">Total Items</span>
                    <span className="font-semibold text-gray-900">{linesWithTax.filter(l => l.item?.id).length} items</span>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{money(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Tax</span>
                    <span>{money(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-200">
                    <span>Total Amount</span>
                    <span className="text-brand">{money(totals.subtotal + totals.tax)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between shrink-0 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            className="text-sm px-4 py-2 border border-gray-300 bg-white rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              className="ui-btn-primary text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && !client?.id) || 
                (step === 2 && (!linesWithTax.length || !linesWithTax.some(l => l.item?.id)))
              }
            >
              Next Step
            </button>
          ) : (
            <button
              type="button"
              className="text-sm px-6 py-2 bg-green-600 text-white font-medium rounded shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConfirmOrder}
              disabled={createOrderMut.isPending || overrideTaxMut.isPending}
            >
              {createOrderMut.isPending ? "Confirming..." : "Confirm Order"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
