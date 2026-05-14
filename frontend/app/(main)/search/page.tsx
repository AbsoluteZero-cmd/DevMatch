import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search as SearchIcon, Filter, MapPin, GraduationCap } from "lucide-react"

const developers = [
  {
    name: "Alex Kim",
    university: "Seoul National University",
    skills: ["React", "Python", "ML"],
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
  },
  {
    name: "Jordan Lee",
    university: "POSTECH",
    skills: ["Node.js", "TypeScript", "AWS"],
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
  },
  {
    name: "Taylor Park",
    university: "Yonsei University",
    skills: ["Java", "Spring", "Kubernetes"],
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
  },
]

export default function SearchPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Find Developers</h1>
            <p className="mt-1 text-muted-foreground">
              Search for talented student developers to collaborate with.
            </p>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, skill, or university..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Results */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {developers.map((dev) => (
              <Card key={dev.name} className="cursor-pointer border-border bg-card transition-all hover:border-primary/30 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={dev.avatar} alt={dev.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {dev.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{dev.name}</h3>
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5" />
                        <span>{dev.university}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {dev.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
  )
}
