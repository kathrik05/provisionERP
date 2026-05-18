import { NavLink, Outlet } from "react-router-dom";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/clients", label: "Clients" },
  { to: "/inventory", label: "Inventory" },
  { to: "/sales", label: "Sales" },
  { to: "/taxes", label: "Taxes" },
  { to: "/invoices", label: "Invoices" },
  { to: "/reports", label: "Reports" },
];

export default function AppLayout() {
  return (
    <div className="h-full flex">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="h-14 flex items-center px-4 border-b border-gray-200">
          <div className="text-sm font-semibold">Provisions ERP</div>
        </div>
        <div className="h-[calc(100%-3.5rem)] flex flex-col justify-between">
          <nav className="p-3 space-y-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "block px-3 py-2 rounded text-sm",
                    isActive
                      ? "text-primary-600 bg-blue-50"
                      : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <nav className="p-3 border-t border-gray-200">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                [
                  "block px-3 py-2 rounded text-sm",
                  isActive
                    ? "text-primary-600 bg-blue-50"
                    : "text-gray-700 hover:bg-gray-50",
                ].join(" ")
              }
            >
              Settings
            </NavLink>
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}
