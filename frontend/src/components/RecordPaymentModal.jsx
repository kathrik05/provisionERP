import { useMemo, useState } from "react";
import Modal from "./Modal.jsx";

export default function RecordPaymentModal({
  open,
  onClose,
  onRecord,
  pending,
  remaining,
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});

  const max = useMemo(() => Number(remaining ?? 0) || 0, [remaining]);

  async function submit() {
    const errs = {};
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt <= 0) errs.amount = "Amount must be > 0";
    if (amt > max) errs.amount = "Amount exceeds remaining balance";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    await onRecord({
      amount: amt,
      method,
      payment_date: paymentDate || undefined,
      notes: notes || null,
    });
  }

  return (
    <Modal
      title="Record Payment"
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
            Record Payment
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Amount *</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
          {errors.amount ? <div className="text-xs text-red-600 mt-1">{errors.amount}</div> : null}
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Payment Date</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>
    </Modal>
  );
}

