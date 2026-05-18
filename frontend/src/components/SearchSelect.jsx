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
        className="w-full text-left border border-gray-200 rounded px-3 py-2 text-sm bg-white hover:bg-gray-50"
        onClick={() => setOpen((v) => !v)}
      >
        {displayValue || <span className="text-gray-500">{placeholder}</span>}
      </button>
      {open ? (
        <div className="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded shadow-sm">
          <div className="p-2 border-b border-gray-200">
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search…"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-auto">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-600">Loading…</div>
            ) : isError ? (
              <div className="px-3 py-2 text-sm text-red-600">Failed to load</div>
            ) : rows.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-600">No results</div>
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
                      "w-full text-left px-3 py-2 text-sm hover:bg-gray-50",
                      active ? "bg-blue-50 text-primary-600" : "text-gray-800",
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
