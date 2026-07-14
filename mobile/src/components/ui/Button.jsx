import { Pressable, Text, ActivityIndicator } from "react-native"
import { cn } from "../../lib/utils"

const variants = {
  primary: {
    button: "bg-primary active:bg-primary-dark shadow-md",
    text: "text-white",
  },
  outline: {
    button: "border-2 border-primary bg-transparent active:bg-primary/20",
    text: "text-primary",
  },
  secondary: {
    button: "bg-secondary active:bg-secondary-light shadow-md",
    text: "text-dark",
  },
  accent: {
    button: "bg-accent active:opacity-90 shadow-md",
    text: "text-white",
  },
  ghost: {
    button: "bg-transparent active:bg-primary/10",
    text: "text-primary",
  },
  chip: {
    button: "bg-cream-dark border border-gray-light active:bg-secondary/30",
    text: "text-dark",
  },
}

const sizes = {
  sm: {
    button: "px-3 py-1.5",
    text: "text-sm",
  },
  md: {
    button: "px-5 py-2.5",
    text: "text-base",
  },
  lg: {
    button: "px-7 py-3.5",
    text: "text-lg",
  },
}

export default function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  rounded = true,
  loading = false,
  className,
  textClassName,
  ...props
}) {
  const selectedVariant = variants[variant] || variants.primary
  const selectedSize = sizes[size] || sizes.md

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className={cn(
        "flex-row items-center justify-center gap-2",
        rounded ? "rounded-full" : "rounded-lg",
        selectedVariant.button,
        selectedSize.button,
        className
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" || variant === "ghost" ? "#0B6B3A" : "#FFFFFF"} />
      ) : typeof children === "string" ? (
        <Text
          className={cn(
            "font-semibold text-center",
            selectedVariant.text,
            selectedSize.text,
            textClassName
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
