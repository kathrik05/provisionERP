import React from "react";
import { cn } from "./cn";

export const DataTableContext = React.createContext({ gridCols: "" });

export default function DataTable({
  title,
  right,
  columns,
  rows,
  renderRow,
  empty,
  className,
  gridCols = "",
}) {
  return (
    <DataTableContext.Provider value={{ gridCols }}>
      <div className={cn("w-full", className)}>
      {title ? (
        <div className="flex items-center justify-between mb-6">
          <div className="text-lg font-semibold text-[#111]">{title}</div>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      ) : null}

      {/* Header */}
      <div
        className={cn(
          "hidden sm:grid gap-6 px-6 pb-3 text-xs uppercase tracking-wider text-gray-400 font-semibold",
          gridCols
        )}
      >
        {columns.map((c) => (
          <div
            key={c.key}
            className={c.align === "right" ? "text-right" : "text-left"}
          >
            {c.header}
          </div>
        ))}
      </div>

        {/* Rows */}
        <div className="flex flex-col">
          {rows?.length ? (
            rows.map(renderRow)
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-gray-400 bg-white rounded-2xl border border-[#F0F0F0] border-dashed">
              {empty ?? "Nothing to show"}
            </div>
          )}
        </div>
      </div>
    </DataTableContext.Provider>
  );
}

