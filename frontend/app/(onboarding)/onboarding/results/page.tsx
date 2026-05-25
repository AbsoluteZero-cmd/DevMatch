"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  ArrowRight,
  Code,
  Database,
  Brain,
  Layout,
  Server,
  Shield,
  Smartphone,
  Container,
  FlaskConical,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { fetchProtectedApi } from "@/lib/api"

// ----- types -----
interface RoleRead {
  id: number
  name: string
  tier: string
  skill_level: "Beginner" | "Intermediate" | "Advanced" | "Expert"
}

interface SkillTagRead {
  id: number
  name: string
  is_ai_generated: boolean
}

interface ProfileRead {
  id: string
  full_name: string | null
  roles: RoleRead[]
  skill_tags: SkillTagRead[]
}

// ----- helpers -----
const LEVEL_ORDER = ["Beginner", "Intermediate", "Advanced", "Expert"] as const
type Level = (typeof LEVEL_ORDER)[number]

const levelColors: Record<Level, string> = {
  Beginner: "bg-gray-100 text-gray-700 border-gray-200",
  Intermediate: "bg-blue-100 text-blue-700 border-blue-200",
  Advanced: "bg-purple-100 text-purple-700 border-purple-200",
  Expert: "bg-green-100 text-green-700 border-green-200",
}

const levelBadgeColors: Record<Level, string> = {
  Beginner: "bg-gray-400",
  Intermediate: "bg-blue-500",
  Advanced: "bg-purple-500",
  Expert: "bg-green-500",
}

const roleIcons: Record<string, React.ElementType> = {
  "Frontend Engineer": Layout,
  "Backend Engineer": Server,
  "Full-Stack Engineer": Code,
  "Mobile Engineer (iOS / Android)": Smartphone,
  "DevOps / Infrastructure Engineer": Container,
  "Data Engineer": Database,
  "ML / AI Engineer": Brain,
  "Data Scientist": FlaskConical,
  "Security Engineer": Shield,
  "QA Engineer": CheckCircle2,
}

export default function ResultsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileRead | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAccepted, setIsAccepted] = useState(false)

  useEffect(() => {
    fetchProtectedApi<ProfileRead>("/profile/me")
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleContinue = () => {
    setIsAccepted(true)
    setTimeout(() => router.push("/dashboard"), 800)
  }

  // Roles to show: already filtered server-side to skill_level != Beginner
  const roles = profile?.roles ?? []
  // Sort by level descending for display
  const sortedRoles = [...roles].sort(
    (a, b) =>
      LEVEL_ORDER.indexOf(b.skill_level as Level) -
      LEVEL_ORDER.indexOf(a.skill_level as Level)
  )
  const aiTags = profile?.skill_tags.filter(t => t.is_ai_generated) ?? []
  const manualTags = profile?.skill_tags.filter(t => !t.is_ai_generated) ?? []

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">D</span>
            </div>
            <span className="text-xl font-semibold text-foreground">DevMatch</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-24">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your results…</p>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Analysis Complete!
                </h1>
                <p className="text-muted-foreground">
                  {roles.length > 0
                    ? `We identified ${roles.length} role${roles.length > 1 ? "s" : ""} for your profile.`
                    : "We could not detect any roles yet — add more projects and try again."}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Detected Roles */}
                {sortedRoles.length > 0 && (
                  <Card className="border-border bg-card md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5 text-primary" />
                        Your Developer Roles
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {sortedRoles.map((role, index) => {
                          const Icon = roleIcons[role.name] ?? Code
                          return (
                            <div
                              key={role.id}
                              className={cn(
                                "relative rounded-lg border p-4 transition-all",
                                index === 0
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-card"
                              )}
                            >
                              {index === 0 && (
                                <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                                  Primary
                                </span>
                              )}
                              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                                <Icon className="h-6 w-6 text-foreground" />
                              </div>
                              <h3 className="font-semibold text-foreground">
                                {role.name}
                              </h3>
                              <span
                                className={cn(
                                  "mt-2 inline-block rounded-full border px-3 py-1 text-sm font-medium",
                                  levelColors[role.skill_level as Level]
                                )}
                              >
                                {role.skill_level}
                              </span>
                              <div className="mt-3 flex gap-1">
                                {LEVEL_ORDER.map((lvl, i) => (
                                  <div
                                    key={lvl}
                                    className={cn(
                                      "h-1.5 flex-1 rounded-full",
                                      i <=
                                        LEVEL_ORDER.indexOf(
                                          role.skill_level as Level
                                        )
                                        ? levelBadgeColors[role.skill_level as Level]
                                        : "bg-muted"
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI-Suggested Tags */}
                {aiTags.length > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        AI-Suggested Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 text-sm text-muted-foreground">
                        These tags help teams find developers like you.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {aiTags.map(tag => (
                          <span
                            key={tag.id}
                            className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm font-medium text-primary"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Manual Tags */}
                {manualTags.length > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-primary" />
                        Your Skill Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {manualTags.map(tag => (
                          <span
                            key={tag.id}
                            className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="mt-8 flex flex-col items-center gap-4">
                <Button
                  size="lg"
                  className="w-full max-w-md"
                  onClick={handleContinue}
                  disabled={isAccepted}
                >
                  {isAccepted ? (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Profile Created!
                    </>
                  ) : (
                    <>
                      Continue to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  You can update your skills and preferences in settings.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
