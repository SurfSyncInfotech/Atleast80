import { cn } from "../../lib/utils"

export default function Chip({ children, icon, active = false, className, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-nunito font-medium transition-all duration-200 whitespace-nowrap cursor-pointer",
        active
          ? "bg-primary text-white shadow-md"
          : "bg-white text-dark border border-gray-light hover:border-primary hover:text-primary",
        className
      )}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {children}
    </button>
  )
}
