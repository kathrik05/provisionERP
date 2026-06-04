import { NavLink } from "react-router-dom";
import { cn } from "./cn";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/clients", label: "Clients" },
  { to: "/inventory", label: "Inventory" },
  { to: "/sales", label: "Sales" },
  { to: "/taxes", label: "Taxes" },
  { to: "/invoices", label: "Invoices" },
  { to: "/reports", label: "Reports" },
  { to: "/offers", label: "Offers" },
];

function Item({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition",
          isActive
            ? "bg-emerald-50 text-brand shadow-soft"
            : "text-app-text-secondary hover:text-app-text-primary hover:bg-white/60"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isActive ? "bg-brand" : "bg-brand/25"
            )}
          />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-[280px] shrink-0 p-4">
      <div className="ui-card w-full overflow-hidden">
        <div className="px-5 py-4 border-b border-app-border/70">
          <div className="text-sm font-semibold tracking-tight">Provisions ERP</div>
          <div className="text-xs text-app-text-secondary mt-0.5">
            Operations Dashboard
          </div>
        </div>
        <div className="p-3 space-y-1">
          {nav.map((item) => (
            <Item key={item.to} to={item.to} label={item.label} />
          ))}
        </div>
        <div className="p-3 border-t border-app-border/70">
          <Item to="/settings" label="Settings" />
        </div>
      </div>
    </aside>
  );
}
