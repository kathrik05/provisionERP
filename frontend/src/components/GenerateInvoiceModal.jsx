import { useState } from "react";
import Modal from "./Modal.jsx";

export default function GenerateInvoiceModal({ open, onClose, onGenerate, pending }) {
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});

  async function submit() {
    const errs = {};
    if (!dueDate) errs.dueDate = "Due date is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await onGenerate({ due_date: dueDate, notes: notes || null });
  }

  return (
    <Modal
      title="Generate Invoice"
      open={open}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="text-sm px-3 py-2 rounded bg-primary-600 text-white hover:opacity-95 disabled:opacity-50"
            onClick={submit}
            disabled={pending}
          >
            Generate Invoice
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Due Date *</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
          {errors.dueDate ? <div className="text-xs text-red-600 mt-1">{errors.dueDate}</div> : null}
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>
    </Modal>
  );
}

