import { useEffect, useMemo, useState } from "react";
import { Edit2, TriangleAlert, UserX, Wrench } from "lucide-react";
import { useLocation } from "react-router-dom";
import Modal from "../components/Modal.jsx";
import {
  useAdjustStock,
  useCreateItem,
  useDeactivateItem,
  useInventoryList,
  useUpdateItem,
} from "../hooks/useInventory";
import { useTaxRules } from "../hooks/useTaxes";

function validateItem(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = "Name is required";
  if (!values.unit?.trim()) errors.unit = "Unit is required";
  const price = Number(values.price);
  if (Number.isNaN(price) || price <= 0) errors.price = "Price must be > 0";

  if (values.track_stock) {
    const qty = Number(values.stock_quantity ?? 0);
    const reorder = Number(values.reorder_level ?? 0);
    if (Number.isNaN(qty) || qty < 0) errors.stock_quantity = "Must be >= 0";
    if (Number.isNaN(reorder) || reorder < 0) errors.reorder_level = "Must be >= 0";
  }
  return errors;
}

const emptyItem = {
  name: "",
  category: "",
  unit: "",
  price: "",
  description: "",
  track_stock: false,
  stock_quantity: "0",
  reorder_level: "0",
  tax_id: "",
};

export default function InventoryPage() {
  const loc = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(loc.search);
    setLowStockOnly(p.get("low_stock") === "true");
  }, [loc.search]);

  const listQuery = useInventoryList({ search, lowStockOnly });
  const createMut = useCreateItem();
  const updateMut = useUpdateItem();
  const deactivateMut = useDeactivateItem();
  const adjustMut = useAdjustStock();
  const taxRulesQuery = useTaxRules({ active_only: true });
  const taxRules = useMemo(() => taxRulesQuery.data ?? [], [taxRulesQuery.data]);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [itemErrors, setItemErrors] = useState({});

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("");
  const [adjustErrors, setAdjustErrors] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  function openAdd() {
    setEditing(null);
    setItemForm(emptyItem);
    setItemErrors({});
    setItemModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setItemForm({
      name: item.name ?? "",
      category: item.category ?? "",
      unit: item.unit ?? "",
      price: String(item.price ?? ""),
      description: item.description ?? "",
      track_stock: !!item.track_stock,
      stock_quantity: String(item.stock_quantity ?? 0),
      reorder_level: String(item.reorder_level ?? 0),
      tax_id: item.tax_id ?? "",
    });
    setItemErrors({});
    setItemModalOpen(true);
  }

  function closeItemModal() {
    if (createMut.isPending || updateMut.isPending) return;
    setItemModalOpen(false);
  }

  async function saveItem() {
    const errs = validateItem(itemForm);
    setItemErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      name: itemForm.name.trim(),
      category: itemForm.category?.trim() || null,
      unit: itemForm.unit.trim(),
      price: Number(itemForm.price),
      description: itemForm.description?.trim() || null,
      track_stock: !!itemForm.track_stock,
      stock_quantity: itemForm.track_stock ? Number(itemForm.stock_quantity ?? 0) : 0,
      reorder_level: itemForm.track_stock ? Number(itemForm.reorder_level ?? 0) : 0,
      tax_id: itemForm.tax_id ? itemForm.tax_id : null,
    };

    if (editing?.id) {
      await updateMut.mutateAsync({ id: editing.id, payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setItemModalOpen(false);
  }

  function openAdjust(item) {
    setAdjustItem(item);
    setAdjustment("");
    setReason("");
    setAdjustErrors({});
    setAdjustOpen(true);
  }

  function closeAdjust() {
    if (adjustMut.isPending) return;
    setAdjustOpen(false);
  }

  async function doAdjust() {
    const errs = {};
    const adj = Number(adjustment);
    if (Number.isNaN(adj) || adj === 0) errs.adjustment = "Enter a non-zero number";
    if (!reason.trim()) errs.reason = "Reason is required";
    setAdjustErrors(errs);
    if (Object.keys(errs).length) return;

    await adjustMut.mutateAsync({
      id: adjustItem.id,
      payload: { adjustment: Number(adjustment), reason: reason.trim() },
    });
    setAdjustOpen(false);
  }

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-base font-semibold">Inventory</h1>
        <button
          type="button"
          onClick={openAdd}
          className="bg-primary-600 text-white text-sm px-3 py-2 rounded hover:opacity-95"
        >
          Add Item
        </button>
      </header>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or category…"
            className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={() => setLowStockOnly((v) => !v)}
            className={[
              "text-sm px-3 py-2 rounded border border-gray-200 text-left",
              lowStockOnly ? "bg-blue-50 text-primary-600" : "bg-white hover:bg-gray-50",
            ].join(" ")}
          >
            Show Low Stock Only
          </button>
        </div>

        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">Category</th>
                <th className="text-left font-medium px-4 py-3">Unit</th>
                <th className="text-right font-medium px-4 py-3">Price</th>
                <th className="text-right font-medium px-4 py-3">Stock</th>
                <th className="text-right font-medium px-4 py-3">Reorder Level</th>
                <th className="text-left font-medium px-4 py-3">Type</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-600" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              ) : listQuery.isError ? (
                <tr>
                  <td className="px-4 py-6 text-center text-red-600" colSpan={8}>
                    Failed to load items
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-600" colSpan={8}>
                    No items found
                  </td>
                </tr>
              ) : (
                rows.map((i) => {
                  const isTracked = !!i.track_stock;
                  const isLow =
                    isTracked && Number(i.stock_quantity) <= Number(i.reorder_level);
                  return (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{i.name}</td>
                      <td className="px-4 py-3">{i.category ?? "-"}</td>
                      <td className="px-4 py-3">{i.unit}</td>
                      <td className="px-4 py-3 text-right">{i.price}</td>
                      <td className="px-4 py-3 text-right">
                        {!isTracked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">
                            On Demand
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <TriangleAlert className="w-4 h-4" />
                            {i.stock_quantity}
                          </span>
                        ) : (
                          i.stock_quantity
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isTracked ? i.reorder_level : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {isTracked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-primary-600 text-xs">
                            Stocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">
                            On Demand
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            className="p-2 rounded hover:bg-gray-100"
                            onClick={() => openEdit(i)}
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isTracked ? (
                            <button
                              type="button"
                              className="p-2 rounded hover:bg-gray-100"
                              onClick={() => openAdjust(i)}
                              title="Adjust Stock"
                            >
                              <Wrench className="w-4 h-4" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="p-2 rounded hover:bg-gray-100 text-red-600 disabled:opacity-50"
                            onClick={() => deactivateMut.mutate(i.id)}
                            disabled={deactivateMut.isPending}
                            title="Deactivate"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        title={editing ? "Edit Item" : "Add Item"}
        open={itemModalOpen}
        onClose={closeItemModal}
        footer={
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
              onClick={closeItemModal}
              disabled={createMut.isPending || updateMut.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-sm px-3 py-2 rounded bg-primary-600 text-white hover:opacity-95 disabled:opacity-50"
              onClick={saveItem}
              disabled={createMut.isPending || updateMut.isPending}
            >
              Save
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Name *</label>
            <input
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            {itemErrors.name ? (
              <div className="text-xs text-red-600 mt-1">{itemErrors.name}</div>
            ) : null}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Category</label>
            <input
              value={itemForm.category}
              onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Unit *</label>
            <input
              value={itemForm.unit}
              onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            {itemErrors.unit ? (
              <div className="text-xs text-red-600 mt-1">{itemErrors.unit}</div>
            ) : null}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Price *</label>
            <input
              value={itemForm.price}
              onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            {itemErrors.price ? (
              <div className="text-xs text-red-600 mt-1">{itemErrors.price}</div>
            ) : null}
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Description</label>
            <textarea
              rows={3}
              value={itemForm.description}
              onChange={(e) =>
                setItemForm({ ...itemForm, description: e.target.value })
              }
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Tax</label>
            <select
              value={itemForm.tax_id}
              onChange={(e) => setItemForm({ ...itemForm, tax_id: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">No Tax</option>
              {taxRules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.rate}%)
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 flex items-center justify-between border border-gray-200 rounded px-3 py-2">
            <div className="text-sm">Track Stock</div>
            <button
              type="button"
              onClick={() =>
                setItemForm((v) => ({ ...v, track_stock: !v.track_stock }))
              }
              className={[
                "text-xs px-2 py-1 rounded border",
                itemForm.track_stock
                  ? "bg-blue-50 text-primary-600 border-blue-100"
                  : "bg-white text-gray-700 border-gray-200",
              ].join(" ")}
            >
              {itemForm.track_stock ? "ON" : "OFF"}
            </button>
          </div>

          {itemForm.track_stock ? (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Stock Quantity
                </label>
                <input
                  value={itemForm.stock_quantity}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, stock_quantity: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
                {itemErrors.stock_quantity ? (
                  <div className="text-xs text-red-600 mt-1">
                    {itemErrors.stock_quantity}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Reorder Level
                </label>
                <input
                  value={itemForm.reorder_level}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, reorder_level: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
                {itemErrors.reorder_level ? (
                  <div className="text-xs text-red-600 mt-1">
                    {itemErrors.reorder_level}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      <Modal
        title="Adjust Stock"
        open={adjustOpen}
        onClose={closeAdjust}
        footer={
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
              onClick={closeAdjust}
              disabled={adjustMut.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-sm px-3 py-2 rounded bg-primary-600 text-white hover:opacity-95 disabled:opacity-50"
              onClick={doAdjust}
              disabled={adjustMut.isPending}
            >
              Adjust
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="text-sm font-semibold">{adjustItem?.name}</div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Adjustment</label>
            <input
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              placeholder="e.g. 10 or -5"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            {adjustErrors.adjustment ? (
              <div className="text-xs text-red-600 mt-1">
                {adjustErrors.adjustment}
              </div>
            ) : null}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Reason *</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='e.g. "Received from supplier"'
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            {adjustErrors.reason ? (
              <div className="text-xs text-red-600 mt-1">{adjustErrors.reason}</div>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}
