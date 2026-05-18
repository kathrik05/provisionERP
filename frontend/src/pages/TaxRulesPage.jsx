import { useMemo, useState } from "react";
import { Star, Pencil, ShieldCheck, UserX } from "lucide-react";
import Modal from "../components/Modal.jsx";
import {
  useCreateTaxRule,
  useDeactivateTaxRule,
  useSetDefaultTaxRule,
  useTaxRules,
  useUpdateTaxRule,
} from "../hooks/useTaxes";

function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex px-2 py-1 rounded text-xs bg-green-50 text-green-700">
      Active
    </span>
  ) : (
    <span className="inline-flex px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
      Inactive
    </span>
  );
}

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
          className="bg-primary-600 text-white text-sm px-3 py-2 rounded hover:opacity-95"
        >
          Add Tax Rule
        </button>
      </header>

      <div className="p-6">
        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-right font-medium px-4 py-3">Rate (%)</th>
                <th className="text-center font-medium px-4 py-3">Default</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-600" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : listQuery.isError ? (
                <tr>
                  <td className="px-4 py-6 text-center text-red-600" colSpan={5}>
                    Failed to load tax rules
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-600" colSpan={5}>
                    No tax rules found
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3 text-right">{r.rate}</td>
                    <td className="px-4 py-3 text-center">
                      {r.is_default ? <Star className="w-4 h-4 inline text-amber-500" /> : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={!!r.is_active} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="p-2 rounded hover:bg-gray-100"
                          onClick={() => openEdit(r)}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!r.is_default ? (
                          <button
                            type="button"
                            className="p-2 rounded hover:bg-gray-100 text-amber-700 disabled:opacity-50"
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
                            className="p-2 rounded hover:bg-gray-100 text-red-600 disabled:opacity-50"
                            onClick={() => deactivateMut.mutate(r.id)}
                            disabled={deactivateMut.isPending}
                            title="Deactivate"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
              className="text-sm px-3 py-2 rounded bg-primary-600 text-white hover:opacity-95 disabled:opacity-50"
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
                form.is_default ? "bg-blue-50 text-primary-600 border-blue-100" : "bg-white text-gray-700 border-gray-200",
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

