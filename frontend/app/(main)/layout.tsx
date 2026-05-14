import { Navbar } from "@/components/navbar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      {children}
    </div>
  )
}
