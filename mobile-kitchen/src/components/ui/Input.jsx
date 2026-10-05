import { useState } from "react"
import { TextInput, View, Platform } from "react-native"
import { cn } from "../../lib/utils"

export default function Input({
  value,
  onChangeText,
  placeholder,
  icon: Icon,
  className,
  inputClassName,
  keyboardType = "default",
  secureTextEntry = false,
  autoCapitalize = "none",
  style: customStyle,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false)
  const isMultiline = props.multiline

  return (
    <View
      className={cn(
        "flex-row w-full px-4 rounded-xl border border-gray-light bg-cream/50",
        isMultiline ? "h-28 items-start py-2.5" : "h-[52] items-center",
        isFocused && "border-primary bg-white",
        className
      )}
    >
      {Icon && (
        <Icon
          size={17}
          className={cn("text-gray mr-3", isMultiline && "mt-1")}
        />
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7A7A7A"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        onFocus={(e) => {
          setIsFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          props.onBlur?.(e)
        }}
        className={cn(
          "flex-1 h-full text-sm font-nunito text-dark",
          inputClassName
        )}
        style={[
          customStyle,
          isMultiline && { textAlignVertical: "top" },
          Platform.select({
            web: {
              outlineStyle: "none",
              outlineWidth: 0,
              outlineColor: "transparent",
            },
          }),
        ]}
        {...props}
      />
    </View>
  )
}
