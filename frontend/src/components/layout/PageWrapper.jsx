import { cn } from "../../lib/utils"

export default function PageWrapper({ children, className, noNav = false, noPadding = false }) {
  return (
    <main
      className={cn(
        "min-h-screen bg-cream",
        !noNav && "pb-20 md:pb-8",
        !noPadding && "px-4 md:px-10 lg:px-16 xl:px-24",
        className
      )}
    >
      {children}
    </main>
  )
}
