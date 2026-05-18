import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import SearchSelect from "../components/SearchSelect.jsx";
import { useClients } from "../hooks/useClients";
import { useInventoryList } from "../hooks/useInventory";
import {
  useCreateSalesOrder,
  useOverrideLineTax,
  useSalesOrder,
  useUpdateExtraCharge,
  useUpdateSalesOrder,
} from "../hooks/useSales";
import { useTaxRules } from "../hooks/useTaxes";

function money(n) {
  const x = Number(n ?? 0);
  if (Number.isNaN(x)) return "0.00";
  return x.toFixed(2);
}

function computeTotals(lines) {
  const subtotal = lines.reduce(
    (sum, li) => sum + Number(li.quantity || 0) * Number(li.unit_price || 0),
    0,
  );
  const tax = lines.reduce((sum, li) => sum + Number(li.tax_amount || 0), 0);
  return { subtotal, tax };
}

export default function SalesOrderFormPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const orderQuery = useSalesOrder(id);
  const createMut = useCreateSalesOrder();
  const updateMut = useUpdateSalesOrder();
  const extraChargeMut = useUpdateExtraCharge();
  const overrideTaxMut = useOverrideLineTax();
  const taxRulesQuery = useTaxRules({ active_only: true });

  const [client, setClient] = useState(null);
  const [clientSearch, setClientSearch] = useState("");
  const clientsQuery = useClients(clientSearch);

  const [orderDate, setOrderDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]);
  const [extraChargeLabel, setExtraChargeLabel] = useState("");
  const [extraCharge, setExtraCharge] = useState("0");

  const [itemSearch, setItemSearch] = useState("");
  const inventoryQuery = useInventoryList({ search: itemSearch, lowStockOnly: false });

  useEffect(() => {
    if (!orderQuery.data) return;
    const o = orderQuery.data;
    setClient(o.client ? { id: o.client.id, name: o.client.name } : { id: o.client_id, name: "" });
    setOrderDate(o.order_date || "");
    setNotes(o.notes || "");
    setExtraChargeLabel(o.extra_charge_label || "");
    setExtraCharge(String(o.extra_charge ?? 0));
    setLines(
      (o.items || []).map((li) => ({
        item: li.item
          ? {
              id: li.item.id,
              name: li.item.name,
              unit: li.item.unit,
              price: li.unit_price,
              tax_id: li.tax_id ?? null,
            }
          : { id: li.item_id, tax_id: li.tax_id ?? null },
        unit: li.item?.unit ?? "",
        unit_price: String(li.unit_price ?? ""),
        quantity: String(li.quantity ?? ""),
        tax_id: li.tax_id ?? null,
        tax_amount: Number(li.tax_amount ?? 0),
      })),
    );
  }, [orderQuery.data]);

  const taxRules = useMemo(() => taxRulesQuery.data ?? [], [taxRulesQuery.data]);

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
  const extra = Number(extraCharge || 0) || 0;
  const total = totals.subtotal + totals.tax + extra;

  const title = isEdit
    ? orderQuery.data
      ? `Edit Order #${orderQuery.data.order_number}`
      : "Edit Order"
    : "New Order";

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

  async function onSave() {
    if (!client?.id) return;
    const payload = {
      client_id: client.id,
      order_date: orderDate || undefined,
      notes: notes || null,
      items: linesWithTax
        .filter((li) => li.item?.id)
        .map((li) => ({
          item_id: li.item.id,
          quantity: Number(li.quantity),
          unit_price: Number(li.unit_price),
        })),
    };

    if (isEdit) {
      const out = await updateMut.mutateAsync({ id, payload });
      await extraChargeMut.mutateAsync({
        id: out.id,
        payload: { extra_charge: Number(extraCharge || 0) || 0, extra_charge_label: extraChargeLabel || null },
      });
      await Promise.all(
        linesWithTax
          .filter((li) => li.item?.id)
          .map((li) =>
            overrideTaxMut.mutateAsync({
              orderId: out.id,
              itemId: li.item.id,
              tax_id: li.tax_id || null,
            }),
          ),
      );
      nav(`/sales/${out.id}`);
    } else {
      const out = await createMut.mutateAsync(payload);
      await extraChargeMut.mutateAsync({
        id: out.id,
        payload: { extra_charge: Number(extraCharge || 0) || 0, extra_charge_label: extraChargeLabel || null },
      });
      await Promise.all(
        linesWithTax
          .filter((li) => li.item?.id)
          .map((li) =>
            overrideTaxMut.mutateAsync({
              orderId: out.id,
              itemId: li.item.id,
              tax_id: li.tax_id || null,
            }),
          ),
      );
      nav(`/sales/${out.id}`);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-base font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => nav("/sales")}
            className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
            disabled={createMut.isPending || updateMut.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="text-sm px-3 py-2 rounded bg-primary-600 text-white hover:opacity-95 disabled:opacity-50"
            disabled={
              createMut.isPending ||
              updateMut.isPending ||
              extraChargeMut.isPending ||
              overrideTaxMut.isPending ||
              !client?.id
            }
          >
            Save
          </button>
        </div>
      </header>

      <div className="p-6 space-y-4">
        <div className="bg-white rounded border border-gray-200 p-5 space-y-3">
          <div className="text-sm font-semibold">Order Details</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Client</label>
              <SearchSelect
                value={client?.id ?? ""}
                displayValue={client?.name ?? ""}
                placeholder="Select client…"
                options={clientsQuery.data ?? []}
                isLoading={clientsQuery.isLoading}
                isError={clientsQuery.isError}
                searchValue={clientSearch}
                onSearchChange={setClientSearch}
                getOptionLabel={(c) => c.name}
                getOptionValue={(c) => c.id}
                onChange={(c) => setClient({ id: c.id, name: c.name })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Order Date</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Line Items</div>
            <button
              type="button"
              onClick={addLine}
              className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
            >
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Item</th>
                  <th className="text-left font-medium px-3 py-2">Unit</th>
                  <th className="text-right font-medium px-3 py-2">Unit Price</th>
                  <th className="text-right font-medium px-3 py-2">Quantity</th>
                  <th className="text-left font-medium px-3 py-2">Tax</th>
                  <th className="text-right font-medium px-3 py-2">Tax Amount</th>
                  <th className="text-right font-medium px-3 py-2">Line Total</th>
                  <th className="text-right font-medium px-3 py-2">Remove</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-gray-600 text-center">
                      No line items. Click “Add Item”.
                    </td>
                  </tr>
                ) : (
                  linesWithTax.map((li, idx) => {
                    const lineTotal = li.lineSubtotal;
                    return (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="px-3 py-2">
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
                        </td>
                        <td className="px-3 py-2 text-gray-700">{li.unit || "-"}</td>
                        <td className="px-3 py-2">
                          <input
                            value={li.unit_price}
                            onChange={(e) => updateLine(idx, { unit_price: e.target.value })}
                            className="w-28 text-right border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={li.quantity}
                            onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                            className="w-24 text-right border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={li.tax_id || ""}
                            onChange={(e) =>
                              updateLine(idx, { tax_id: e.target.value ? e.target.value : null })
                            }
                            className="w-48 border border-gray-200 rounded px-2 py-1 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="">No Tax</option>
                            {taxRules.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.rate}%)
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">{money(li.tax_amount)}</td>
                        <td className="px-3 py-2 text-right">{money(lineTotal)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="p-2 rounded hover:bg-gray-100 text-red-600"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded border border-gray-200 p-5 w-full max-w-md ml-auto space-y-2">
          <div className="text-sm font-semibold">Order Summary</div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{money(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span>{money(totals.tax)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 items-end">
            <div>
              <div className="text-xs text-gray-600 mb-1">Extra Charge Label</div>
              <input
                value={extraChargeLabel}
                onChange={(e) => setExtraChargeLabel(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                placeholder='e.g. "Service Charge"'
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Extra Charge</div>
              <input
                value={extraCharge}
                onChange={(e) => setExtraCharge(e.target.value)}
                className="w-full text-right border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
