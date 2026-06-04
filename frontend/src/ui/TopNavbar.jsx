import { cn } from "./cn";

export default function TopNavbar({ title, right, className }) {
  return (
    <div
      className={cn(
        "sticky top-0 z-40 no-print",
        "backdrop-blur-xl bg-white/55 border-b border-app-border/70",
        className
      )}
    >
      <div className="h-16 px-5 sm:px-7 lg:px-10 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-[15px] sm:text-base font-semibold tracking-tight truncate">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">{right}</div>
      </div>
    </div>
  );
}

