import { createContext, useContext, useState } from "react"

const ComposerContext = createContext(null)

export function ComposerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)

  const value = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }

  return (
    <ComposerContext.Provider value={value}>
      {children}
    </ComposerContext.Provider>
  )
}

export function useComposer() {
  const ctx = useContext(ComposerContext)

  if (!ctx) {
    throw new Error("useComposer must be used inside <ComposerProvider>")
  }

  return ctx
}