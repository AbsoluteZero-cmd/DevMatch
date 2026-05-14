"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Users, Briefcase, Plus, Send, CheckCircle2 } from "lucide-react"

type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert"

interface Developer {
  id: string
  name: string
  avatar: string
  role: string
  skillLevel: SkillLevel
  university: string
  topSkills: string[]
  offerSent: boolean
}

const teamData = {
  name: "Team Phoenix",
  activePostings: [
    { id: "1", title: "Frontend Developer", applicants: 12 },
    { id: "2", title: "Backend Engineer", applicants: 8 },
    { id: "3", title: "ML Engineer", applicants: 5 },
  ],
}

const recommendedDevelopers: Developer[] = [
  {
    id: "1",
    name: "Veronica Park",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
    role: "Full Stack Developer",
    skillLevel: "Advanced",
    university: "KAIST",
    topSkills: ["React", "Node.js", "TypeScript"],
    offerSent: false,
  },
  {
    id: "2",
    name: "Alex Jobs",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    role: "Backend Engineer",
    skillLevel: "Expert",
    university: "Seoul National University",
    topSkills: ["Python", "Django", "PostgreSQL"],
    offerSent: false,
  },
  {
    id: "3",
    name: "Emily Ha",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    role: "ML Engineer",
    skillLevel: "Intermediate",
    university: "Yonsei University",
    topSkills: ["Python", "TensorFlow", "PyTorch"],
    offerSent: false,
  },
  {
    id: "4",
    name: "Daniel Caeser",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    role: "Frontend Developer",
    skillLevel: "Beginner",
    university: "Korea University",
    topSkills: ["JavaScript", "React", "CSS"],
    offerSent: false,
  },
]

const levelStyles: Record<SkillLevel, string> = {
  Beginner: "bg-muted text-muted-foreground",
  Intermediate: "bg-primary/20 text-primary",
  Advanced: "bg-primary/30 text-primary",
  Expert: "bg-primary text-primary-foreground",
}

export default function DashboardPage() {
  const [developers, setDevelopers] = useState(recommendedDevelopers)

  const handleSendOffer = (developerId: string) => {
    setDevelopers(devs =>
      devs.map(dev =>
        dev.id === developerId ? { ...dev, offerSent: true } : dev
      )
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
          {/* Team Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{teamData.name}</h1>
              <p className="mt-1 text-muted-foreground">
                Team Leader Dashboard
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Job Posting
            </Button>
          </div>

          {/* Active Job Postings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Active Job Postings</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teamData.activePostings.map((posting) => (
                <Card key={posting.id} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">{posting.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {posting.applicants} applicants
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        Active
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Recommended Developers */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Recommended Developers</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {developers.map((developer) => (
                <Card key={developer.id} className="border-border bg-card transition-all hover:border-primary/30 hover:shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <Avatar className="h-14 w-14 shrink-0">
                        <AvatarImage src={developer.avatar} alt={developer.name} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {developer.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">{developer.name}</h3>
                            <p className="text-sm text-muted-foreground">{developer.university}</p>
                          </div>
                          <Badge className={cn("shrink-0", levelStyles[developer.skillLevel])}>
                            {developer.skillLevel}
                          </Badge>
                        </div>
                        <p className="mt-2 font-medium text-primary">{developer.role}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {developer.topSkills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4">
                          <Button
                            onClick={() => handleSendOffer(developer.id)}
                            disabled={developer.offerSent}
                            variant={developer.offerSent ? "outline" : "default"}
                            className="w-full gap-2"
                          >
                            {developer.offerSent ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Offer Sent
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                Send Offer
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
  )
}
