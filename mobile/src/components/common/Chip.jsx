import { TouchableOpacity, Text, View } from "react-native"
import { cn } from "../../lib/utils"

export default function Chip({ children, icon, active = false, className, textClassName, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={cn(
        "flex-row items-center gap-1.5 px-4 py-2.5 rounded-full border",
        active
          ? "bg-primary border-primary shadow-sm"
          : "bg-white border-gray-light",
        className
      )}
    >
      {icon && <View className="flex-row items-center">{icon}</View>}
      <Text
        className={cn(
          "text-sm font-nunito font-semibold",
          active ? "text-white" : "text-dark",
          textClassName
        )}
      >
        {children}
      </Text>
    </TouchableOpacity>
  )
}
