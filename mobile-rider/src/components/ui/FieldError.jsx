import { Text } from "react-native"

export default function FieldError({ message }) {
  if (!message) return null

  return (
    <Text
      style={{
        marginTop: 6,
        fontSize: 11,
        lineHeight: 15,
        color: "#DC2626",
        fontFamily: "Nunito",
        fontWeight: "600",
      }}
    >
      {message}
    </Text>
  )
}
