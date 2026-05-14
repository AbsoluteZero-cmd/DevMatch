"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

type VerificationState = "loading" | "success" | "error" | "expired"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, setState] = useState<VerificationState>("loading")

  useEffect(() => {
    const verifyEmail = async () => {
      // Simulate API verification call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock verification logic
      if (!token) {
        setState("error")
      } else if (token === "expired") {
        setState("expired")
      } else {
        setState("success")
      }
    }

    verifyEmail()
  }, [token])

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
        <Card className="w-full max-w-md border-border bg-card">
          <CardContent className="pt-8 pb-8 text-center">
            {state === "loading" && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">Verifying your email</h2>
                <p className="text-muted-foreground">
                  Please wait while we verify your email address...
                </p>
              </>
            )}

            {state === "success" && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">Email verified!</h2>
                <p className="mb-6 text-muted-foreground">
                  Your email has been successfully verified. You can now sign in to your account.
                </p>
                <Button className="w-full" asChild>
                  <Link href="/login">Continue to Sign In</Link>
                </Button>
              </>
            )}

            {state === "error" && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">Verification failed</h2>
                <p className="mb-6 text-muted-foreground">
                  The verification link is invalid or has already been used.
                </p>
                <div className="space-y-3">
                  <Button className="w-full" asChild>
                    <Link href="/register">Register Again</Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/login">Back to Sign In</Link>
                  </Button>
                </div>
              </>
            )}

            {state === "expired" && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                  <XCircle className="h-8 w-8 text-yellow-600" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">Link expired</h2>
                <p className="mb-6 text-muted-foreground">
                  This verification link has expired. Please request a new one.
                </p>
                <div className="space-y-3">
                  <Button className="w-full">
                    Resend Verification Email
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/login">Back to Sign In</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
