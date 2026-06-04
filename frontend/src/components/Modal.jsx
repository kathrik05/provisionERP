export default function Modal({ title, open, onClose, children, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        tabIndex={0}
      />

      <div className="relative w-full max-w-lg ui-card overflow-hidden">
        <div className="px-6 py-5 border-b border-app-border/70 flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          <button
            type="button"
            className="ui-btn-secondary px-3 py-1.5 text-sm"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        {footer ? (
          <div className="px-6 py-5 border-t border-app-border/70">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

