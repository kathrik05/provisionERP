import { useEffect, useMemo, useState } from "react";
import { Edit2, UserX } from "lucide-react";
import Modal from "../components/Modal.jsx";
import {
  useClients,
  useCreateClient,
  useDeactivateClient,
  useUpdateClient,
} from "../hooks/useClients";

function isValidEmail(v) {
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validateForm(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = "Name is required";
  if (values.phone) {
    if (!/^\d+$/.test(values.phone)) errors.phone = "Phone must be numeric";
    if (values.phone.length > 15) errors.phone = "Max 15 digits";
  }
  if (values.email && !isValidEmail(values.email)) errors.email = "Invalid email";
  const credit = Number(values.credit_limit ?? 0);
  if (Number.isNaN(credit) || credit < 0)
    errors.credit_limit = "Must be >= 0";
  return errors;
}

const emptyForm = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  credit_limit: "0",
  address: "",
};

export default function ClientsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const clientsQuery = useClients(search);
  const createMut = useCreateClient();
  const updateMut = useUpdateClient();
  const deactivateMut = useDeactivateClient();

  const rows = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(client) {
    setEditing(client);
    setForm({
      name: client.name ?? "",
      contact_person: client.contact_person ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      credit_limit: String(client.credit_limit ?? 0),
      address: client.address ?? "",
    });
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    if (createMut.isPending || updateMut.isPending) return;
    setModalOpen(false);
  }

  async function onSave() {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      name: form.name.trim(),
      contact_person: form.contact_person?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      address: form.address?.trim() || null,
      credit_limit: Number(form.credit_limit ?? 0),
    };

    if (editing?.id) {
      await updateMut.mutateAsync({ id: editing.id, payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setModalOpen(false);
  }

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-base font-semibold">Clients</h1>
        <button
          type="button"
          onClick={openAdd}
          className="bg-primary-600 text-white text-sm px-3 py-2 rounded hover:opacity-95"
        >
          Add Client
        </button>
      </header>

      <div className="p-6 space-y-4">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, phone, or email…"
          className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />

        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">
                  Contact Person
                </th>
                <th className="text-left font-medium px-4 py-3">Phone</th>
                <th className="text-left font-medium px-4 py-3">Email</th>
                <th className="text-right font-medium px-4 py-3">Credit Limit</th>
                <th className="text-right font-medium px-4 py-3">Outstanding</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clientsQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-600" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : clientsQuery.isError ? (
                <tr>
                  <td className="px-4 py-6 text-center text-red-600" colSpan={7}>
                    Failed to load clients
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-600" colSpan={7}>
                    No clients found
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3">{c.contact_person ?? "-"}</td>
                    <td className="px-4 py-3">{c.phone ?? "-"}</td>
                    <td className="px-4 py-3">{c.email ?? "-"}</td>
                    <td className="px-4 py-3 text-right">{c.credit_limit}</td>
                    <td className="px-4 py-3 text-right">{c.outstanding_balance}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="p-2 rounded hover:bg-gray-100"
                          onClick={() => openEdit(c)}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded hover:bg-gray-100 text-red-600 disabled:opacity-50"
                          onClick={() => deactivateMut.mutate(c.id)}
                          disabled={deactivateMut.isPending}
                          title="Deactivate"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
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
        title={editing ? "Edit Client" : "Add Client"}
        open={modalOpen}
        onClose={closeModal}
        footer={
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
              onClick={closeModal}
              disabled={createMut.isPending || updateMut.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-sm px-3 py-2 rounded bg-primary-600 text-white hover:opacity-95 disabled:opacity-50"
              onClick={onSave}
              disabled={createMut.isPending || updateMut.isPending}
            >
              Save
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-1">
            <label className="block text-xs text-gray-600 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            {errors.name ? (
              <div className="text-xs text-red-600 mt-1">{errors.name}</div>
            ) : null}
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-gray-600 mb-1">
              Contact Person
            </label>
            <input
              value={form.contact_person}
              onChange={(e) =>
                setForm({ ...form, contact_person: e.target.value })
              }
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="col-span-1">
            <label className="block text-xs text-gray-600 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            {errors.phone ? (
              <div className="text-xs text-red-600 mt-1">{errors.phone}</div>
            ) : null}
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-gray-600 mb-1">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            {errors.email ? (
              <div className="text-xs text-red-600 mt-1">{errors.email}</div>
            ) : null}
          </div>

          <div className="col-span-1">
            <label className="block text-xs text-gray-600 mb-1">Credit Limit</label>
            <input
              value={form.credit_limit}
              onChange={(e) =>
                setForm({ ...form, credit_limit: e.target.value })
              }
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
            {errors.credit_limit ? (
              <div className="text-xs text-red-600 mt-1">
                {errors.credit_limit}
              </div>
            ) : null}
          </div>
          <div className="col-span-1" />

          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Address</label>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

