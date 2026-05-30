"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface UnreadContextValue {
  unreadCount: number
  increment: () => void
  clear: () => void
}

const UnreadContext = createContext<UnreadContextValue>({
  unreadCount: 0,
  increment: () => {},
  clear: () => {},
})

export function UnreadProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0)

  const increment = useCallback(() => setCount((c) => c + 1), [])
  const clear = useCallback(() => setCount(0), [])

  return (
    <UnreadContext.Provider value={{ unreadCount: count, increment, clear }}>
      {children}
    </UnreadContext.Provider>
  )
}

export function useUnread() {
  return useContext(UnreadContext)
}
