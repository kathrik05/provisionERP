import DashboardCard from "./DashboardCard";

export default function ChartContainer({ title, subtitle, right, children }) {
  return (
    <DashboardCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          {subtitle ? (
            <div className="text-xs text-app-text-secondary mt-1">{subtitle}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      <div className="mt-4">{children}</div>
    </DashboardCard>
  );
}

