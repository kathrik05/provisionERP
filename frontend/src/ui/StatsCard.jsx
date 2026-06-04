import { cn } from "./cn";
import DashboardCard from "./DashboardCard";

export default function StatsCard({
  title,
  value,
  accentClassName,
  onClick,
  className,
}) {
  return (
    <DashboardCard
      as={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "p-5 text-left ui-card-hover",
        onClick
          ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-100"
          : "",
        className
      )}
    >
      <div className="text-xs font-medium text-app-text-secondary">{title}</div>
      <div
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight",
          accentClassName
        )}
      >
        {value}
      </div>
    </DashboardCard>
  );
}
