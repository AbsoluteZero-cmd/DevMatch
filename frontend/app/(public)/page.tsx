"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Users, 
  Sparkles, 
  GitBranch, 
  Target, 
  ArrowRight, 
  CheckCircle2,
  Zap,
  Shield,
  Globe
} from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Matching",
    description: "Our intelligent algorithm analyzes your skills, experience, and preferences to find the perfect team fit.",
  },
  {
    icon: Users,
    title: "Team Recruitment",
    description: "Build your dream team by discovering talented developers with complementary skill sets.",
  },
  {
    icon: GitBranch,
    title: "GitHub Integration",
    description: "Connect your GitHub profile for automatic skill analysis based on your real projects and contributions.",
  },
  {
    icon: Target,
    title: "Skill-Level Analysis",
    description: "Get accurate assessments of your abilities - from Beginner to Expert - based on your actual work.",
  },
]

const benefits = [
  "Smart matching algorithm finds your ideal teammates",
  "Automatic skill detection from your repositories",
  "Connect with developers from top universities",
  "Real-time chat and collaboration tools",
  "Privacy controls for your profile data",
  "Role-based recommendations tailored to you",
]

const stats = [
  { value: "5,000+", label: "Developers" },
  { value: "1,200+", label: "Teams Formed" },
  { value: "50+", label: "Universities" },
  { value: "95%", label: "Match Success" },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">D</span>
            </div>
            <span className="text-xl font-semibold text-foreground">DevMatch</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              How It Works
            </Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Login
            </Link>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,var(--tw-gradient-from)_0%,var(--tw-gradient-to)_100%)] from-primary/10 to-transparent" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI-Powered Developer Matching</span>
              </div>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Find Your Perfect
                <span className="block text-primary">Development Team</span>
              </h1>
              <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
                DevMatch uses AI to analyze your skills, connect you with compatible developers, 
                and help you build amazing projects together. Join thousands of developers 
                finding their ideal teammates.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/register">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/login">
                    Sign In
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-border bg-muted/30 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-primary sm:text-4xl">{stat.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything You Need to Build Great Teams
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful features designed to streamline developer collaboration and team formation.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="border-border bg-card transition-shadow hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="bg-muted/30 py-20 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How DevMatch Works
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Get matched with your ideal team in three simple steps.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  icon: Globe,
                  title: "Create Your Profile",
                  description: "Sign up and connect your GitHub account. Our AI will automatically analyze your repositories and detect your skills.",
                },
                {
                  step: "02",
                  icon: Zap,
                  title: "Get AI Analysis",
                  description: "Our algorithm evaluates your experience and assigns skill levels from Beginner to Expert based on your actual work.",
                },
                {
                  step: "03",
                  icon: Shield,
                  title: "Match & Collaborate",
                  description: "Receive personalized recommendations, connect with compatible developers, and start building together.",
                },
              ].map((item) => (
                <div key={item.step} className="relative">
                  <div className="mb-4 text-6xl font-bold text-primary/10">{item.step}</div>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                    <item.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Why Developers Love DevMatch
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Join a community of passionate developers who are building the future together.
                </p>
                <ul className="mt-8 space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10">
                  <Button size="lg" asChild>
                    <Link href="/register">
                      Join DevMatch Today
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8">
                  <div className="flex h-full flex-col justify-center space-y-4">
                    {[
                      { name: "Alex Chen", role: "Frontend Engineer", level: "Expert", skills: ["React", "TypeScript"] },
                      { name: "Sarah Kim", role: "Backend Developer", level: "Advanced", skills: ["Python", "FastAPI"] },
                      { name: "Mike Johnson", role: "ML Engineer", level: "Intermediate", skills: ["PyTorch", "TensorFlow"] },
                    ].map((dev, i) => (
                      <Card key={i} className="border-border bg-card/80 backdrop-blur">
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="h-12 w-12 rounded-full bg-primary/20" />
                          <div className="flex-1">
                            <div className="font-semibold text-foreground">{dev.name}</div>
                            <div className="text-sm text-muted-foreground">{dev.role}</div>
                          </div>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            {dev.level}
                          </span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary py-20">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to Find Your Team?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80">
              Join thousands of developers who have already found their perfect teammates through DevMatch.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/register">
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">D</span>
              </div>
              <span className="text-lg font-semibold text-foreground">DevMatch</span>
            </div>
            <p className="text-sm text-muted-foreground">
              KAIST CS Department Project
            </p>
            <div className="flex items-center gap-6">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Login
              </Link>
              <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground">
                Register
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
