import { useState } from "react";
import Modal from "./Modal.jsx";
import PillButton from "../ui/PillButton.jsx";

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
          <PillButton
            variant="secondary"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </PillButton>
          <PillButton
            onClick={submit}
            disabled={pending}
          >
            Generate Invoice
          </PillButton>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-app-text-secondary mb-1">
            Due Date *
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full"
          />
          {errors.dueDate ? (
            <div className="text-xs text-red-600 mt-1">{errors.dueDate}</div>
          ) : null}
        </div>
        <div>
          <label className="block text-xs text-app-text-secondary mb-1">
            Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full"
          />
        </div>
      </div>
    </Modal>
  );
}
