"use client"

import { useState, useEffect, useRef } from "react"
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
  Loader2,
  AlertCircle,
} from "lucide-react"
import { fetchProtectedApi } from "@/lib/api"

interface AnalysisStep {
  id: string
  label: string
  icon: React.ElementType
  status: "pending" | "running" | "complete"
}

export default function AnalysisPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const hasRun = useRef(false)

  const [steps, setSteps] = useState<AnalysisStep[]>([
    { id: "fetch", label: "Fetching profile data", icon: Github, status: "pending" },
    { id: "analyze", label: "Analyzing code patterns", icon: Code, status: "pending" },
    { id: "classify", label: "Generating role classifications", icon: Brain, status: "pending" },
    { id: "finalize", label: "Finalizing skill assessments", icon: CheckCircle2, status: "pending" },
  ])

  const setStep = (id: string, status: AnalysisStep["status"]) =>
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s))

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const runAnalysis = async () => {
      try {
        // Step 1 — UI only, profile data already in DB
        setStep("fetch", "running")
        await delay(800)
        setProgress(20)
        setStep("fetch", "complete")

        // Step 2 — UI only
        setStep("analyze", "running")
        await delay(600)
        setProgress(40)
        setStep("analyze", "complete")

        // Step 3 — actual LLM call (blocking so we wait for real results)
        setStep("classify", "running")
        await fetchProtectedApi("/profile/analyze/sync", { method: "POST" })
        setProgress(80)
        setStep("classify", "complete")

        // Step 4 — finalising
        setStep("finalize", "running")
        await delay(600)
        setProgress(100)
        setStep("finalize", "complete")

        await delay(400)
        router.push("/onboarding/results")
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Analysis failed. Please try again."
        setError(message)
      }
    }

    runAnalysis()
  }, [router])

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

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg border-border bg-card">
          <CardContent className="pt-8 pb-8">
            {error ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-xl font-bold text-foreground">Analysis Failed</h2>
                <p className="text-sm text-muted-foreground">{error}</p>
                <button
                  onClick={() => {
                    hasRun.current = false
                    setError(null)
                    setProgress(0)
                    setSteps(prev => prev.map(s => ({ ...s, status: "pending" as const })))
                  }}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
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
                  Our AI is reviewing your experience and generating skill assessments.
                </p>

                <div className="mb-8">
                  <Progress value={progress} className="h-2" />
                  <p className="mt-2 text-center text-sm text-muted-foreground">
                    {progress}% complete
                  </p>
                </div>

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
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          step.status === "complete"
                            ? "bg-green-100"
                            : step.status === "running"
                            ? "bg-primary/10"
                            : "bg-muted"
                        )}
                      >
                        {step.status === "running" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : step.status === "complete" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <step.icon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "font-medium",
                          step.status === "complete"
                            ? "text-green-700"
                            : step.status === "running"
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
