import { createContext, useContext } from "react"

export const KitchenPanelContext = createContext({
  openStoryModal: () => {},
  storiesRevision: 0,
})

export function useKitchenPanel() {
  return useContext(KitchenPanelContext)
}
