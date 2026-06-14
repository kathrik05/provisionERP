import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import Sidebar from "../ui/Sidebar.jsx";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/clients", label: "Clients" },
  { to: "/inventory", label: "Inventory" },
  { to: "/sales", label: "Sales" },
  { to: "/taxes", label: "Taxes" },
  { to: "/suppliers", label: "Suppliers" },
  { to: "/purchases", label: "Purchases" },
  { to: "/price-history", label: "Price History" },
  { to: "/invoices", label: "Invoices" },
  { to: "/reports", label: "Reports" },
  { to: "/offers", label: "Offers" },
  { to: "/settings", label: "Settings" },
];

function MobileNav({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        tabIndex={0}
      />
      <div className="absolute left-4 right-4 top-4 ui-card p-3 max-h-[calc(100vh-2rem)] flex flex-col">
        <div className="px-2 pb-2 flex items-center justify-between shrink-0">
          <div className="text-sm font-semibold tracking-tight">Provisions ERP</div>
          <button type="button" className="ui-btn-secondary px-3 py-1.5" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="space-y-1 overflow-y-auto p-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  "block px-3.5 py-2.5 rounded-2xl text-sm font-medium transition",
                  isActive
                    ? "bg-emerald-50 text-brand shadow-soft"
                    : "text-app-text-secondary hover:text-app-text-primary hover:bg-white/60",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const currentLabel = useMemo(() => {
    const match = nav.find((n) => location.pathname.startsWith(n.to));
    return match?.label ?? "Dashboard";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-app-bg text-app-text-primary">
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-app-border/70 flex items-center px-4 py-3">
        <button
          type="button"
          className="ui-btn-secondary px-3 py-1.5 mr-3"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          Menu
        </button>
        <div className="font-semibold text-sm">{currentLabel}</div>
      </div>

      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
