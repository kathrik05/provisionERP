import { useMemo, useState } from "react";
import { Star, Pencil, ShieldCheck, UserX, Percent } from "lucide-react";
import Modal from "../components/Modal.jsx";
import {
  useCreateTaxRule,
  useDeactivateTaxRule,
  useSetDefaultTaxRule,
  useTaxRules,
  useUpdateTaxRule,
} from "../hooks/useTaxes";

import DataTable from "../ui/DataTable.jsx";
import TableRowCard from "../ui/TableRowCard.jsx";
import StatusPill from "../ui/StatusPill.jsx";
import EmptyState from "../ui/EmptyState.jsx";

const emptyForm = { name: "", rate: "0", is_default: false };

export default function TaxRulesPage() {
  const listQuery = useTaxRules({ active_only: false });
  const createMut = useCreateTaxRule();
  const updateMut = useUpdateTaxRule();
  const setDefaultMut = useSetDefaultTaxRule();
  const deactivateMut = useDeactivateTaxRule();

  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  }

  function openEdit(r) {
    setEditing(r);
    setForm({
      name: r.name ?? "",
      rate: String(r.rate ?? 0),
      is_default: !!r.is_default,
    });
    setErrors({});
    setOpen(true);
  }

  function close() {
    if (createMut.isPending || updateMut.isPending) return;
    setOpen(false);
  }

  async function save() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    const rate = Number(form.rate);
    if (Number.isNaN(rate) || rate < 0) errs.rate = "Rate must be >= 0";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = { name: form.name.trim(), rate: Number(form.rate), is_default: !!form.is_default };
    if (editing?.id) {
      await updateMut.mutateAsync({ id: editing.id, payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setOpen(false);
  }

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-base font-semibold">Tax Rules</h1>
        <button
          type="button"
          onClick={openAdd}
          className="ui-btn-primary text-sm px-5 py-2.5"
        >
          Add Tax Rule
        </button>
      </header>

      <div className="p-6">
        <DataTable
          gridCols="sm:grid-cols-[1.5fr_1fr_1fr_1fr_120px]"
          columns={[
            { key: "name", header: "Name" },
            { key: "rate", header: "Rate (%)", align: "right" },
            { key: "default", header: "Default", align: "center" },
            { key: "status", header: "Status" },
            { key: "actions", header: "Actions", align: "right" },
          ]}
          rows={listQuery.isLoading || listQuery.isError ? [] : rows}
          empty={
            listQuery.isLoading ? (
              "Loading…"
            ) : listQuery.isError ? (
              "Failed to load tax rules"
            ) : (
              <EmptyState
                icon={Percent}
                title="No tax rules found"
                description="Get started by adding your first tax rule."
                actionLabel="Add Tax Rule"
                onAction={openAdd}
              />
            )
          }
          renderRow={(r) => (
            <TableRowCard key={r.id}>
              <div className="font-semibold text-[#111] truncate">{r.name}</div>
              <div className="text-right whitespace-nowrap text-[#111] font-semibold">{r.rate}</div>
              <div className="flex items-center justify-center">
                {r.is_default ? <Star className="w-4 h-4 text-amber-500 fill-current" /> : null}
              </div>
              <div>
                <StatusPill status={r.is_active ? "Active" : "Inactive"} />
              </div>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-brand hover:bg-[#F5F5F5] transition-colors"
                  onClick={() => openEdit(r)}
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {!r.is_default ? (
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                    onClick={() => setDefaultMut.mutate(r.id)}
                    disabled={setDefaultMut.isPending}
                    title="Set Default"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                ) : null}
                {r.is_active ? (
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-[#FEE2E2] transition-colors disabled:opacity-50"
                    onClick={() => deactivateMut.mutate(r.id)}
                    disabled={deactivateMut.isPending}
                    title="Deactivate"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </TableRowCard>
          )}
        />
      </div>

      <Modal
        title={editing ? "Edit Tax Rule" : "Add Tax Rule"}
        open={open}
        onClose={close}
        footer={
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
              onClick={close}
              disabled={createMut.isPending || updateMut.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ui-btn-primary text-sm px-5 py-2.5 disabled:opacity-50"
              onClick={save}
              disabled={createMut.isPending || updateMut.isPending}
            >
              Save
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            {errors.name ? <div className="text-xs text-red-600 mt-1">{errors.name}</div> : null}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Rate % *</label>
            <input
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            {errors.rate ? <div className="text-xs text-red-600 mt-1">{errors.rate}</div> : null}
          </div>
          <div className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
            <div className="text-sm">Set as Default</div>
            <button
              type="button"
              onClick={() => setForm((v) => ({ ...v, is_default: !v.is_default }))}
              className={[
                "text-xs px-2 py-1 rounded border",
                form.is_default
                  ? "bg-emerald-50 text-brand border-emerald-100"
                  : "bg-white/70 text-app-text-secondary border-app-border hover:bg-white hover:text-app-text-primary",
              ].join(" ")}
            >
              {form.is_default ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
