import { cn } from "./cn";

const styles = {
  primary: "ui-btn-primary",
  secondary: "ui-btn-secondary",
  ghost: "ui-btn-ghost",
  danger:
    "ui-pill bg-red-600 text-white shadow-soft hover:bg-red-700 disabled:opacity-50",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export default function PillButton({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  className,
  ...props
}) {
  return (
    <Comp
      className={cn(
        "ui-pill disabled:opacity-50 disabled:pointer-events-none",
        styles[variant] ?? styles.primary,
        sizes[size] ?? sizes.md,
        className
      )}
      {...props}
    />
  );
}

