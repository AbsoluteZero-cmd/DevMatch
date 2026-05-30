"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Search, Inbox, User, Settings } from "lucide-react"
import { useUnread } from "@/contexts/unread-context"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Search", href: "/search", icon: Search },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Navbar() {
  const pathname = usePathname()
  const { unreadCount } = useUnread()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">D</span>
          </div>
          <span className="text-xl font-semibold text-foreground">DevMatch</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const isInbox = item.name === "Inbox"
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
                {isInbox && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Profile Icon */}
        <Link
          href="/profile"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            pathname === "/profile" 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          <User className="h-5 w-5" />
          <span className="sr-only">Profile</span>
        </Link>

        {/* Mobile Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card p-2 md:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const isInbox = item.name === "Inbox"
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
                {isInbox && unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
          <Link
            href="/profile"
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              pathname === "/profile" 
                ? "text-primary" 
                : "text-muted-foreground"
            )}
          >
            <User className="h-5 w-5" />
            Profile
          </Link>
        </nav>
      </div>
    </header>
  )
}
