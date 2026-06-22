import { cn } from "../../lib/utils"

const variants = {
  primary: "bg-primary text-white hover:bg-primary-dark shadow-md hover:shadow-lg",
  outline: "border-2 border-primary text-primary hover:bg-primary hover:text-white",
  secondary: "bg-secondary text-dark hover:bg-secondary-light shadow-md",
  accent: "bg-accent text-white hover:opacity-90 shadow-md",
  ghost: "text-primary hover:bg-primary/10",
  chip: "bg-cream-dark text-dark hover:bg-secondary/30 border border-gray-light",
}

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3.5 text-lg",
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  rounded = true,
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        "font-poppins font-semibold inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-95",
        rounded ? "rounded-full" : "rounded-lg",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
