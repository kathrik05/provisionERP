import { useEffect, useMemo, useRef, useState } from "react";

export default function SearchSelect({
  value,
  displayValue,
  onChange,
  placeholder,
  options,
  isLoading,
  isError,
  searchValue,
  onSearchChange,
  getOptionLabel,
  getOptionValue,
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const rows = useMemo(() => options ?? [], [options]);

  useEffect(() => {
    function onDoc(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        className="w-full text-left ui-card px-4 py-2.5 hover:bg-white ui-card-hover"
        onClick={() => setOpen((v) => !v)}
      >
        {displayValue || (
          <span className="text-app-text-secondary">{placeholder}</span>
        )}
      </button>

      {open ? (
        <div className="absolute z-[9999] mt-2 w-full ui-card overflow-hidden">
          <div className="p-3 border-b border-app-border/70">
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search…"
              className="w-full"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-auto p-1">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-app-text-secondary">
                Loading…
              </div>
            ) : isError ? (
              <div className="px-3 py-2 text-sm text-red-600">
                Failed to load
              </div>
            ) : rows.length === 0 ? (
              <div className="px-3 py-2 text-sm text-app-text-secondary">
                No results
              </div>
            ) : (
              rows.map((opt) => {
                const optVal = getOptionValue(opt);
                const active = value === optVal;
                return (
                  <button
                    type="button"
                    key={optVal}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={[
                      "w-full text-left px-3 py-2 text-sm rounded-xl transition",
                      active
                        ? "bg-emerald-50 text-brand"
                        : "text-app-text-primary hover:bg-white/70",
                    ].join(" ")}
                  >
                    {getOptionLabel(opt)}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

