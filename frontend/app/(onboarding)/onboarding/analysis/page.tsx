"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { 
  Github, 
  Code, 
  Brain, 
  CheckCircle2,
  Loader2
} from "lucide-react"

interface AnalysisStep {
  id: string
  label: string
  icon: React.ElementType
  status: "pending" | "running" | "complete"
}

export default function AnalysisPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [steps, setSteps] = useState<AnalysisStep[]>([
    { id: "fetch", label: "Fetching GitHub repositories", icon: Github, status: "pending" },
    { id: "analyze", label: "Analyzing code patterns", icon: Code, status: "pending" },
    { id: "classify", label: "Generating role classifications", icon: Brain, status: "pending" },
    { id: "finalize", label: "Finalizing skill assessments", icon: CheckCircle2, status: "pending" },
  ])

  useEffect(() => {
    const runAnalysis = async () => {
      // Step 1: Fetching repositories
      setSteps(prev => prev.map(s => s.id === "fetch" ? { ...s, status: "running" } : s))
      await new Promise(resolve => setTimeout(resolve, 2000))
      setProgress(25)
      setSteps(prev => prev.map(s => s.id === "fetch" ? { ...s, status: "complete" } : s))

      // Step 2: Analyzing code
      setSteps(prev => prev.map(s => s.id === "analyze" ? { ...s, status: "running" } : s))
      await new Promise(resolve => setTimeout(resolve, 2500))
      setProgress(50)
      setSteps(prev => prev.map(s => s.id === "analyze" ? { ...s, status: "complete" } : s))

      // Step 3: Generating classifications
      setSteps(prev => prev.map(s => s.id === "classify" ? { ...s, status: "running" } : s))
      await new Promise(resolve => setTimeout(resolve, 2000))
      setProgress(75)
      setSteps(prev => prev.map(s => s.id === "classify" ? { ...s, status: "complete" } : s))

      // Step 4: Finalizing
      setSteps(prev => prev.map(s => s.id === "finalize" ? { ...s, status: "running" } : s))
      await new Promise(resolve => setTimeout(resolve, 1500))
      setProgress(100)
      setSteps(prev => prev.map(s => s.id === "finalize" ? { ...s, status: "complete" } : s))

      // Redirect to results
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push("/onboarding/results")
    }

    runAnalysis()
  }, [router])

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

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg border-border bg-card">
          <CardContent className="pt-8 pb-8">
            {/* Animation */}
            <div className="relative mx-auto mb-8 h-32 w-32">
              <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20" />
              <div className="absolute inset-4 animate-pulse rounded-full bg-primary/30" style={{ animationDelay: "150ms" }} />
              <div className="absolute inset-8 animate-pulse rounded-full bg-primary/40" style={{ animationDelay: "300ms" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="h-12 w-12 text-primary animate-bounce" style={{ animationDuration: "2s" }} />
              </div>
            </div>

            <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
              Analyzing Your Profile
            </h2>
            <p className="mb-8 text-center text-muted-foreground">
              Our AI is reviewing your repositories and generating skill assessments.
            </p>

            {/* Progress Bar */}
            <div className="mb-8">
              <Progress value={progress} className="h-2" />
              <p className="mt-2 text-center text-sm text-muted-foreground">{progress}% complete</p>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border p-4 transition-colors",
                    step.status === "complete" 
                      ? "border-green-200 bg-green-50" 
                      : step.status === "running"
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-card"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    step.status === "complete"
                      ? "bg-green-100"
                      : step.status === "running"
                      ? "bg-primary/10"
                      : "bg-muted"
                  )}>
                    {step.status === "running" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : step.status === "complete" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <step.icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className={cn(
                    "font-medium",
                    step.status === "complete"
                      ? "text-green-700"
                      : step.status === "running"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
