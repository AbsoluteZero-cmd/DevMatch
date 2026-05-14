"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, ArrowLeft, Mail, Loader2 } from "lucide-react"

type FormState = "default" | "loading" | "success" | "error"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [touched, setTouched] = useState(false)
  const [formState, setFormState] = useState<FormState>("default")
  const [errorMessage, setErrorMessage] = useState("")

  const isEmailValid = email.includes("@") && email.includes(".")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)

    if (!isEmailValid) return

    setFormState("loading")
    setErrorMessage("")

    // Mock API call with simulated delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Simulate success/error based on email
    // For demo: emails containing "notfound" will fail
    if (email.toLowerCase().includes("notfound")) {
      setFormState("error")
      setErrorMessage("No account found with this email address")
    } else {
      setFormState("success")
    }
  }

  const handleTryAgain = () => {
    setFormState("default")
    setEmail("")
    setTouched(false)
    setErrorMessage("")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Simple Header */}
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
          {formState === "success" ? (
            // Success State
            <>
              <CardHeader className="space-y-1 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
                <CardDescription>
                  We&apos;ve sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  Didn&apos;t receive the email? Check your spam folder or try again with a different email address.
                </p>
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleTryAgain}
                  >
                    Try another email
                  </Button>
                  <Link href="/login" className="w-full">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </>
          ) : (
            // Default / Loading / Error State
            <>
              <CardHeader className="space-y-1 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
                <CardDescription>
                  Enter your email address and we&apos;ll send you a link to reset your password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Error Banner */}
                  {formState === "error" && errorMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (formState === "error") {
                          setFormState("default")
                          setErrorMessage("")
                        }
                      }}
                      onBlur={() => setTouched(true)}
                      disabled={formState === "loading"}
                      className={cn(
                        touched && !isEmailValid && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {touched && !isEmailValid && (
                      <p className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        Please enter a valid email address
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={formState === "loading"}
                  >
                    {formState === "loading" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  {/* Back to Login Link */}
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  )
}
