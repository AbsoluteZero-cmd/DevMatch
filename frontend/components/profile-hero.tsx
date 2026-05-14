import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, GraduationCap } from "lucide-react"

interface ProfileHeroProps {
  name: string
  university: string
  location?: string
  bio: string
  avatarUrl?: string
}

export function ProfileHero({ name, university, location, bio, avatarUrl }: ProfileHeroProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-secondary/10 p-6 sm:p-8">
      <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-secondary/20 blur-3xl" />
      
      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Profile Picture */}
        <Avatar className="h-28 w-28 ring-4 ring-card shadow-xl sm:h-32 sm:w-32">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{name}</h1>
          
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>{university}</span>
            </div>
            {location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{location}</span>
              </div>
            )}
          </div>

          <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-foreground/80">
            {bio}
          </p>
        </div>
      </div>
    </section>
  )
}
