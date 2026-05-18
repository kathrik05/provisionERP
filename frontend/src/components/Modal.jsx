export default function Modal({ title, open, onClose, children, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        role="button"
        tabIndex={0}
      />
      <div className="relative w-full max-w-lg bg-white rounded border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm font-semibold">{title}</div>
          <button
            type="button"
            className="text-sm text-gray-600 hover:text-gray-900"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="px-5 py-4 border-t border-gray-200">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

