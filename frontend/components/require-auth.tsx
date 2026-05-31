"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

/**
 * Guards routes that require an authenticated user.
 *
 * While the auth state is still being restored we show a lightweight loader.
 * Once we know the user is not authenticated we redirect to the login screen
 * with an `authRequired` flag (and the path they tried to reach) so the login
 * page can surface an "Authorization required" message and send them back.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      const params = new URLSearchParams({ authRequired: "1" })
      if (pathname) params.set("redirect", pathname)
      router.replace(`/login?${params.toString()}`)
    }
  }, [isAuthenticated, isLoading, pathname, router])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
