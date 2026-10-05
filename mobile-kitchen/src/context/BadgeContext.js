import { createContext, useContext, useState, useCallback } from "react"

const BadgeContext = createContext({
  enquiryUnreadCount: 0,
  orderActiveCount: 0,
  setEnquiryUnreadCount: () => {},
  setOrderActiveCount: () => {},
})

export function BadgeProvider({ children }) {
  const [enquiryUnreadCount, setEnquiryUnreadCount] = useState(0)
  const [orderActiveCount, setOrderActiveCount] = useState(0)

  const updateEnquiryUnread = useCallback((count) => {
    setEnquiryUnreadCount(count)
  }, [])

  const updateOrderActive = useCallback((count) => {
    setOrderActiveCount(count)
  }, [])

  return (
    <BadgeContext.Provider
      value={{
        enquiryUnreadCount,
        orderActiveCount,
        setEnquiryUnreadCount: updateEnquiryUnread,
        setOrderActiveCount: updateOrderActive,
      }}
    >
      {children}
    </BadgeContext.Provider>
  )
}

export function useBadges() {
  return useContext(BadgeContext)
}
