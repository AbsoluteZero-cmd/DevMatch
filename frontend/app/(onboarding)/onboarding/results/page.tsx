"use client"

import { useState } from "react"
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
  CheckCircle2,
  Edit3
} from "lucide-react"

// Mock AI analysis results
const analysisResults = {
  roles: [
    { 
      name: "Frontend Engineer", 
      level: "Advanced" as const, 
      confidence: 92,
      icon: Layout,
      description: "Strong proficiency in React, TypeScript, and modern CSS frameworks."
    },
    { 
      name: "Full-Stack Developer", 
      level: "Intermediate" as const, 
      confidence: 78,
      icon: Code,
      description: "Capable of working across the stack with Node.js and databases."
    },
    { 
      name: "ML Engineer", 
      level: "Beginner" as const, 
      confidence: 45,
      icon: Brain,
      description: "Foundational knowledge in Python and ML libraries."
    },
  ],
  skills: [
    { name: "React", level: "Expert" as const },
    { name: "TypeScript", level: "Advanced" as const },
    { name: "Next.js", level: "Advanced" as const },
    { name: "TailwindCSS", level: "Expert" as const },
    { name: "Node.js", level: "Intermediate" as const },
    { name: "Python", level: "Intermediate" as const },
    { name: "PostgreSQL", level: "Intermediate" as const },
    { name: "Git", level: "Advanced" as const },
    { name: "Docker", level: "Beginner" as const },
    { name: "AWS", level: "Beginner" as const },
  ],
  suggestedTags: [
    "Web Development",
    "UI/UX",
    "Open Source",
    "Student",
  ],
  repositoriesAnalyzed: 12,
  commitsAnalyzed: 847,
}

const levelColors = {
  Beginner: "bg-gray-100 text-gray-700 border-gray-200",
  Intermediate: "bg-blue-100 text-blue-700 border-blue-200",
  Advanced: "bg-purple-100 text-purple-700 border-purple-200",
  Expert: "bg-green-100 text-green-700 border-green-200",
}

const levelBadgeColors = {
  Beginner: "bg-gray-500",
  Intermediate: "bg-blue-500",
  Advanced: "bg-purple-500",
  Expert: "bg-green-500",
}

export default function ResultsPage() {
  const router = useRouter()
  const [isAccepted, setIsAccepted] = useState(false)

  const handleContinue = () => {
    setIsAccepted(true)
    // Redirect to main dashboard after a brief delay
    setTimeout(() => {
      router.push("/dashboard")
    }, 1000)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
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
          {/* Success Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Analysis Complete!</h1>
            <p className="text-muted-foreground">
              We analyzed {analysisResults.repositoriesAnalyzed} repositories and {analysisResults.commitsAnalyzed} commits to generate your profile.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Detected Roles */}
            <Card className="border-border bg-card md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Your Developer Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {analysisResults.roles.map((role, index) => (
                    <div
                      key={role.name}
                      className={cn(
                        "relative rounded-lg border p-4 transition-all",
                        index === 0 ? "border-primary bg-primary/5" : "border-border bg-card"
                      )}
                    >
                      {index === 0 && (
                        <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                          Primary
                        </span>
                      )}
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        <role.icon className="h-6 w-6 text-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground">{role.name}</h3>
                      <span className={cn(
                        "mt-2 inline-block rounded-full border px-3 py-1 text-sm font-medium",
                        levelColors[role.level]
                      )}>
                        {role.level}
                      </span>
                      <p className="mt-2 text-xs text-muted-foreground">{role.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Skill Levels */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Skill Assessments
                  </span>
                  <Button variant="ghost" size="sm" className="text-xs">
                    <Edit3 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResults.skills.map((skill) => (
                    <div key={skill.name} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{skill.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {["Beginner", "Intermediate", "Advanced", "Expert"].map((level, i) => (
                            <div
                              key={level}
                              className={cn(
                                "h-2 w-6 rounded-full",
                                i <= ["Beginner", "Intermediate", "Advanced", "Expert"].indexOf(skill.level)
                                  ? levelBadgeColors[skill.level]
                                  : "bg-muted"
                              )}
                            />
                          ))}
                        </div>
                        <span className="w-24 text-right text-xs text-muted-foreground">
                          {skill.level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Suggested Tags */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  Suggested Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  These tags help teams find developers like you.
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysisResults.suggestedTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  You can customize these tags in your profile settings.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
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
              You can always update your skills and preferences in settings.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
