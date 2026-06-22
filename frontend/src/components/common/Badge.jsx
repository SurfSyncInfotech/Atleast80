import { cn } from "../../lib/utils"
import { CheckCircle, Home, Leaf } from "lucide-react"

const badgeStyles = {
  verified: {
    bg: "bg-primary-dark text-secondary border-primary-dark",
    icon: <CheckCircle size={14} />,
  },
  homemade: {
    bg: "bg-white text-dark border-gray-light shadow-sm",
    icon: <Home size={14} className="text-primary" />,
  },
  healthy: {
    bg: "bg-white text-dark border-gray-light shadow-sm",
    icon: <Leaf size={14} className="text-primary-light" />,
  },
  offer: {
    bg: "bg-accent/10 text-accent border-accent/20",
    icon: null,
  },
}

export default function Badge({ type = "verified", children, className }) {
  const style = badgeStyles[type] || badgeStyles.verified

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-poppins font-semibold border",
        style.bg,
        className
      )}
    >
      {style.icon}
      {children}
    </span>
  )
}
