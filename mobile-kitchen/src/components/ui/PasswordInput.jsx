import { useState } from "react"
import { TextInput, View, TouchableOpacity, Platform } from "react-native"
import { Eye, EyeOff } from "lucide-react-native"
import { cn } from "../../lib/utils"

export default function PasswordInput({
  value,
  onChangeText,
  placeholder = "Password",
  icon: Icon,
  className,
  inputClassName,
  style: customStyle,
  ...props
}) {
  const [show, setShow] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View
      className={cn(
        "flex-row items-center w-full h-[52] px-4 rounded-xl border border-gray-light bg-cream/50",
        isFocused && "border-primary bg-white",
        className
      )}
    >
      {Icon && (
        <Icon
          size={17}
          className="text-gray mr-3"
        />
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7A7A7A"
        secureTextEntry={!show}
        autoCapitalize="none"
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
      <TouchableOpacity
        onPress={() => setShow((v) => !v)}
        activeOpacity={0.7}
        className="p-1"
      >
        {show ? (
          <EyeOff size={18} className="text-gray" />
        ) : (
          <Eye size={18} className="text-gray" />
        )}
      </TouchableOpacity>
    </View>
  )
}
