import { View, Text } from "react-native"
import { CheckCircle2, Home, Leaf } from "lucide-react-native"
import { cn } from "../../lib/utils"

const badgeStyles = {
  verified: {
    bg: "bg-primary-dark border-primary-dark",
    text: "text-secondary",
    icon: <CheckCircle2 size={13} color="#F4C400" />,
  },
  homemade: {
    bg: "bg-white border-gray-light shadow-sm",
    text: "text-dark",
    icon: <Home size={13} color="#0B6B3A" />,
  },
  healthy: {
    bg: "bg-white border-gray-light shadow-sm",
    text: "text-dark",
    icon: <Leaf size={13} color="#4CAF50" />,
  },
  offer: {
    bg: "bg-accent/10 border-accent/20",
    text: "text-accent",
    icon: null,
  },
}

export default function Badge({ type = "verified", children, className, textClassName }) {
  const style = badgeStyles[type] || badgeStyles.verified

  return (
    <View
      className={cn(
        "flex-row items-center gap-1 px-2.5 py-1 rounded-full border",
        style.bg,
        className
      )}
    >
      {style.icon}
      <Text
        className={cn(
          "text-[10px] font-poppins font-bold",
          style.text,
          textClassName
        )}
      >
        {children}
      </Text>
    </View>
  )
}
