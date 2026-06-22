import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "../../lib/utils"

const baseStyles =
  "w-full py-3.5 rounded-xl border border-gray-light bg-cream/50 font-nunito text-sm transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 focus:bg-white"

export default function PasswordInput({ className, icon: Icon, ...props }) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={17}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray pointer-events-none z-10"
        />
      )}
      <input
        type={show ? "text" : "password"}
        className={cn(baseStyles, Icon ? "pl-11 pr-12" : "px-4 pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray hover:text-dark transition-colors cursor-pointer z-10"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
