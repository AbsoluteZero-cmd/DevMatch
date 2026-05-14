"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type UserRole = "developer" | "team-leader"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (user: User) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "devmatch_auth"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load auth state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsedUser = JSON.parse(stored) as User
        setUser(parsedUser)
      }
    } catch (error) {
      console.error("Failed to load auth state:", error)
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = (newUser: User) => {
    setUser(newUser)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
