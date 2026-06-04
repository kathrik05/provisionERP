import { useEffect, useMemo, useState } from "react";
import { Edit2, TriangleAlert, UserX, Wrench } from "lucide-react";
import { useLocation } from "react-router-dom";
import Modal from "../components/Modal.jsx";
import DataTable from "../ui/DataTable.jsx";
import TableRowCard from "../ui/TableRowCard.jsx";
import StatusPill from "../ui/StatusPill.jsx";
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
          className="ui-btn-primary text-sm px-5 py-2.5"
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
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
          />
          <button
            type="button"
            onClick={() => setLowStockOnly((v) => !v)}
            className={[
              "text-sm px-5 py-2 rounded-full font-medium transition-all duration-300 active:scale-95 text-center",
              lowStockOnly
                ? "bg-emerald-50 text-brand shadow-soft"
                : "bg-white/70 hover:bg-white text-app-text-secondary hover:text-app-text-primary border border-app-border",
            ].join(" ")}
          >
            Low-Stock
          </button>
        </div>

        <DataTable
          gridCols="sm:grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_1fr_1fr_120px]"
          columns={[
            { key: "name", header: "Name" },
            { key: "category", header: "Category" },
            { key: "unit", header: "Unit" },
            { key: "price", header: "Price", align: "right" },
            { key: "stock", header: "Stock", align: "right" },
            { key: "reorder", header: "Reorder Level", align: "right" },
            { key: "type", header: "Type" },
            { key: "actions", header: "Actions", align: "right" },
          ]}
          rows={listQuery.isLoading || listQuery.isError ? [] : rows}
          empty={
            listQuery.isLoading
              ? "Loading…"
              : listQuery.isError
                ? "Failed to load items"
                : "No items found"
          }
          renderRow={(i) => {
            const isTracked = !!i.track_stock;
            const isLow = isTracked && Number(i.stock_quantity) <= Number(i.reorder_level);
            return (
              <TableRowCard key={i.id}>
                <div className="font-semibold text-[#111] truncate">{i.name}</div>
                <div className="text-sm text-gray-500 truncate">{i.category ?? "-"}</div>
                <div className="text-sm text-gray-500 whitespace-nowrap">{i.unit}</div>
                <div className="text-sm text-[#111] text-right font-medium whitespace-nowrap">{i.price}</div>
                <div className="text-sm text-right whitespace-nowrap">
                  {!isTracked ? (
                    <StatusPill status="On Demand" className="bg-gray-100 text-gray-700" />
                  ) : isLow ? (
                    <span className="inline-flex items-center justify-end gap-1 text-amber-700 font-semibold">
                      <TriangleAlert className="w-4 h-4" />
                      {i.stock_quantity}
                    </span>
                  ) : (
                    <span className="text-[#111] font-medium">{i.stock_quantity}</span>
                  )}
                </div>
                <div className="text-sm text-gray-500 text-right whitespace-nowrap">
                  {isTracked ? i.reorder_level : "-"}
                </div>
                <div>
                  {isTracked ? (
                    <StatusPill status="Stocked" />
                  ) : (
                    <StatusPill status="On Demand" className="bg-gray-100 text-gray-700" />
                  )}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-brand hover:bg-[#F5F5F5] transition-all active:scale-95"
                    onClick={() => openEdit(i)}
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {isTracked ? (
                    <button
                      type="button"
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-brand hover:bg-[#F5F5F5] transition-all active:scale-95"
                      onClick={() => openAdjust(i)}
                      title="Adjust Stock"
                    >
                      <Wrench className="w-4 h-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-[#FEE2E2] transition-all active:scale-95 disabled:opacity-50"
                    onClick={() => deactivateMut.mutate(i.id)}
                    disabled={deactivateMut.isPending}
                    title="Deactivate"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </TableRowCard>
            );
          }}
        />
      </div>

      <Modal
        title={editing ? "Edit Item" : "Add Item"}
        open={itemModalOpen}
        onClose={closeItemModal}
        footer={
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm px-5 py-2.5 rounded-full font-medium bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95"
              onClick={closeItemModal}
              disabled={createMut.isPending || updateMut.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ui-btn-primary text-sm px-5 py-2.5 disabled:opacity-50"
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
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
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
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Unit *</label>
            <input
              value={itemForm.unit}
              onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
              placeholder="e.g. kg, litre, packet, box"
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
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
              placeholder="Price per unit (₹)"
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
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
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Tax</label>
            <select
              value={itemForm.tax_id}
              onChange={(e) => setItemForm({ ...itemForm, tax_id: e.target.value })}
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
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
                  ? "bg-emerald-50 text-brand border-emerald-100"
                  : "bg-white/70 text-app-text-secondary border-app-border hover:bg-white hover:text-app-text-primary",
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
                  className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
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
                  className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
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
              className="text-sm px-5 py-2.5 rounded-full font-medium bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95"
              onClick={closeAdjust}
              disabled={adjustMut.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ui-btn-primary text-sm px-5 py-2.5 disabled:opacity-50"
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
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
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
              className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
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
