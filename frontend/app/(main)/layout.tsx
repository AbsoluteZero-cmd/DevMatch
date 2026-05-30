import { Navbar } from "@/components/navbar"
import { UnreadProvider } from "@/contexts/unread-context"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UnreadProvider>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navbar />
        {children}
      </div>
    </UnreadProvider>
  )
}
