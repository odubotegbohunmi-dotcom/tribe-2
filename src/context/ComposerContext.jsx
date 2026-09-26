import { createContext, useContext, useState } from "react"

const ComposerContext = createContext(null)

export function ComposerProvider({ children }) {
  const [isComposerOpen, setIsComposerOpen] = useState(false)

  function openComposer() {
    setIsComposerOpen(true)
  }

  function closeComposer() {
    setIsComposerOpen(false)
  }

  return (
    <ComposerContext.Provider
      value={{
        isComposerOpen,
        openComposer,
        closeComposer,
      }}
    >
      {children}
    </ComposerContext.Provider>
  )
}

export function useComposer() {
  const context = useContext(ComposerContext)

  if (!context) {
    throw new Error(
      "useComposer must be used inside <ComposerProvider>"
    )
  }

  return context
}