import { useContext } from "react";
import { cn } from "./cn";
import { DataTableContext } from "./DataTable";

export default function TableRowCard({ children, className }) {
  const { gridCols } = useContext(DataTableContext) || { gridCols: "" };
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-[#F0F0F0] shadow-soft hover:shadow-bloom transition-all duration-300 hover:-translate-y-1 px-6 py-4 mb-4 flex flex-col sm:grid sm:items-center gap-4 sm:gap-6 text-[15px] font-medium text-[#111]",
        gridCols,
        className
      )}
    >
      {children}
    </div>
  );
}
