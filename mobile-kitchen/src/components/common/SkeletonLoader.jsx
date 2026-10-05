import React, { useEffect, useState } from "react"
import { Animated } from "react-native"
import { cn } from "../../lib/utils"

export default function SkeletonLoader({ className, style }) {
  const [opacity] = useState(() => new Animated.Value(0.35))

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[{ opacity }, style]}
      className={cn("bg-gray-light/60 rounded-xl", className)}
    />
  )
}
