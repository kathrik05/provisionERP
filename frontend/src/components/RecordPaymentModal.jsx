import { useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import PillButton from "../ui/PillButton.jsx";

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
            Record Payment
          </PillButton>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-app-text-secondary mb-1">
            Amount *
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full"
          />
          {errors.amount ? (
            <div className="text-xs text-red-600 mt-1">{errors.amount}</div>
          ) : null}
        </div>
        <div>
          <label className="block text-xs text-app-text-secondary mb-1">
            Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full"
          >
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-app-text-secondary mb-1">
            Payment Date
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-xs text-app-text-secondary mb-1">
            Notes
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full"
          />
        </div>
      </div>
    </Modal>
  );
}
