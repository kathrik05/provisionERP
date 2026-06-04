import { useEffect, useMemo, useState } from "react";
import { Edit2, UserX } from "lucide-react";
import Modal from "../components/Modal.jsx";
import {
  useClients,
  useCreateClient,
  useDeactivateClient,
  useUpdateClient,
} from "../hooks/useClients";
import TableRowCard from "../ui/TableRowCard.jsx";
import DataTable from "../ui/DataTable.jsx";
import PillButton from "../ui/PillButton.jsx";
import TopNavbar from "../ui/TopNavbar.jsx";

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
  if (Number.isNaN(credit) || credit < 0) errors.credit_limit = "Must be >= 0";
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
    <div className="min-h-screen flex flex-col">
      <TopNavbar
        title="Clients"
        right={<PillButton onClick={openAdd}>Add Client</PillButton>}
      />

      <div className="ui-page">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, phone, or email…"
          className="w-full"
        />

        <DataTable
          title="All Clients"
          gridCols="sm:grid-cols-[1.5fr_1.5fr_1fr_1.5fr_1fr_1fr_80px]"
          columns={[
            { key: "name", header: "Name" },
            { key: "contact_person", header: "Contact Person" },
            { key: "phone", header: "Phone" },
            { key: "email", header: "Email" },
            { key: "credit_limit", header: "Credit Limit", align: "right" },
            { key: "outstanding_balance", header: "Outstanding", align: "right" },
            { key: "actions", header: "Actions", align: "right" },
          ]}
          rows={clientsQuery.isLoading || clientsQuery.isError ? [] : rows}
          empty={
            clientsQuery.isLoading
              ? "Loading…"
              : clientsQuery.isError
                ? "Failed to load clients"
                : "No clients found"
          }
          renderRow={(c) => (
            <TableRowCard key={c.id}>
              <div className="font-semibold text-[#111]">{c.name}</div>
              <div className="text-sm text-gray-500">{c.contact_person ?? "-"}</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">{c.phone ?? "-"}</div>
              <div className="text-sm text-gray-500 truncate">{c.email ?? "-"}</div>
              <div className="text-right whitespace-nowrap text-sm text-gray-600">
                {c.credit_limit}
              </div>
              <div className="text-right whitespace-nowrap text-sm font-semibold text-[#111]">
                {c.outstanding_balance}
              </div>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-brand hover:bg-[#F5F5F5] transition-colors"
                  onClick={() => openEdit(c)}
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-[#FEE2E2] transition-colors disabled:opacity-50"
                  onClick={() => deactivateMut.mutate(c.id)}
                  disabled={deactivateMut.isPending}
                  title="Deactivate"
                >
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            </TableRowCard>
          )}
        />
      </div>

      <Modal
        title={editing ? "Edit Client" : "Add Client"}
        open={modalOpen}
        onClose={closeModal}
        footer={
          <div className="flex items-center justify-between">
            <PillButton
              variant="secondary"
              onClick={closeModal}
              disabled={createMut.isPending || updateMut.isPending}
            >
              Cancel
            </PillButton>
            <PillButton
              onClick={onSave}
              disabled={createMut.isPending || updateMut.isPending}
            >
              Save
            </PillButton>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-app-text-secondary mb-1">
              Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full"
            />
            {errors.name ? (
              <div className="text-xs text-red-600 mt-1">{errors.name}</div>
            ) : null}
          </div>
          <div>
            <label className="block text-xs text-app-text-secondary mb-1">
              Contact Person
            </label>
            <input
              value={form.contact_person}
              onChange={(e) =>
                setForm({ ...form, contact_person: e.target.value })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-app-text-secondary mb-1">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full"
            />
            {errors.phone ? (
              <div className="text-xs text-red-600 mt-1">{errors.phone}</div>
            ) : null}
          </div>
          <div>
            <label className="block text-xs text-app-text-secondary mb-1">
              Email
            </label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full"
            />
            {errors.email ? (
              <div className="text-xs text-red-600 mt-1">{errors.email}</div>
            ) : null}
          </div>

          <div>
            <label className="block text-xs text-app-text-secondary mb-1">
              Credit Limit
            </label>
            <input
              value={form.credit_limit}
              onChange={(e) =>
                setForm({ ...form, credit_limit: e.target.value })
              }
              className="w-full"
            />
            {errors.credit_limit ? (
              <div className="text-xs text-red-600 mt-1">
                {errors.credit_limit}
              </div>
            ) : null}
          </div>
          <div className="hidden sm:block" />

          <div className="sm:col-span-2">
            <label className="block text-xs text-app-text-secondary mb-1">
              Address
            </label>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

