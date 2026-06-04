import { cn } from "./cn";

export default function StatusPill({ children, status, className }) {
  // Map typical statuses to soft colors while keeping the base styling
  // if no specific status match is found, fallback to the requested default
  const getColors = (s) => {
    if (!s) return "bg-[#F4F4F5] text-[#444]";
    const lower = s.toLowerCase();
    if (lower.includes("paid") && !lower.includes("unpaid") && !lower.includes("partially")) return "bg-green-50 text-green-700";
    if (lower.includes("unpaid") || lower.includes("overdue") || lower.includes("cancelled")) return "bg-red-50 text-red-700";
    if (lower.includes("partial") || lower.includes("pending")) return "bg-amber-50 text-amber-700";
    if (lower.includes("draft")) return "bg-gray-100 text-gray-700";
    if (lower.includes("confirmed") || lower.includes("stocked") || lower.includes("active")) return "bg-emerald-50 text-brand";
    return "bg-[#F4F4F5] text-[#444]";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
        getColors(status),
        className
      )}
    >
      {children || status}
    </span>
  );
}
