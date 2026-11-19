import { createContext, useCallback, useContext, useMemo, useState } from "react"
import Toast from "../components/common/Toast"

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  const showToast = useCallback((message, type = "error") => {
    const text = typeof message === "string" ? message.trim() : ""
    if (!text) return
    setToast({
      id: Date.now(),
      message: text,
      type: type === "success" || type === "info" ? type : "error",
    })
  }, [])

  const value = useMemo(
    () => ({
      showToast,
      success: (message) => showToast(message, "success"),
      error: (message) => showToast(message, "error"),
      info: (message) => showToast(message, "info"),
    }),
    [showToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        key={toast?.id || "toast"}
        visible={!!toast}
        message={toast?.message}
        type={toast?.type || "error"}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return ctx
}
