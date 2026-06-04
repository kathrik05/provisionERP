import { cn } from "./cn";

export default function DashboardCard({
  as: Comp = "div",
  className,
  children,
  ...props
}) {
  return (
    <Comp className={cn("ui-card", className)} {...props}>
      {children}
    </Comp>
  );
}
