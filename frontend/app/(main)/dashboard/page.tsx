"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Users, Briefcase, Plus, Send, CheckCircle2, Loader2 } from "lucide-react"
import { listMyTeams, sendOffer, type TeamSummary } from "@/lib/api"

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

interface OfferForm {
  team_id: string
  job_posting_id: string
  recipient_id: string
  proposed_role: string
  team_introduction: string
  expected_contributions: string
  compensation_details: string
}

function emptyForm(developer: Developer | null): OfferForm {
  return {
    team_id: "",
    job_posting_id: "",
    recipient_id: developer?.id ?? "",
    proposed_role: developer?.role ?? "",
    team_introduction: "",
    expected_contributions: "",
    compensation_details: "",
  }
}

export default function DashboardPage() {
  const [developers, setDevelopers] = useState(recommendedDevelopers)
  const [offerTarget, setOfferTarget] = useState<Developer | null>(null)
  const [form, setForm] = useState<OfferForm>(emptyForm(null))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<TeamSummary[] | null>(null)
  const [teamsError, setTeamsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listMyTeams()
      .then((data) => {
        if (cancelled) return
        setTeams(data)
      })
      .catch((err) => {
        if (cancelled) return
        const status = (err as { status?: number })?.status
        if (status === 403) {
          setTeamsError("Only team leaders can send offers.")
        } else {
          setTeamsError("Could not load your teams.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedTeam = teams?.find((t) => t.id === form.team_id) ?? null
  const openPostings = (selectedTeam?.job_postings ?? []).filter(
    (p) => p.status === "OPEN"
  )

  const openOffer = (developer: Developer) => {
    setOfferTarget(developer)
    setForm(emptyForm(developer))
    setError(null)
  }

  const closeOffer = () => {
    if (submitting) return
    setOfferTarget(null)
    setError(null)
  }

  const updateField = (key: keyof OfferForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleTeamChange = (teamId: string) => {
    setForm((prev) => ({ ...prev, team_id: teamId, job_posting_id: "" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerTarget) return

    const recipientId = Number(form.recipient_id)
    if (!form.team_id || !form.job_posting_id || !form.recipient_id) {
      setError("Team, job posting, and recipient ID are required.")
      return
    }
    if (Number.isNaN(recipientId)) {
      setError("Recipient ID must be a number.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await sendOffer({
        team_id: form.team_id,
        recipient_id: recipientId,
        job_posting_id: form.job_posting_id,
        proposed_role: form.proposed_role.trim() || undefined,
        team_introduction: form.team_introduction.trim() || undefined,
        expected_contributions: form.expected_contributions.trim() || undefined,
        compensation_details: form.compensation_details.trim() || undefined,
      })
      setDevelopers(devs =>
        devs.map(dev =>
          dev.id === offerTarget.id ? { ...dev, offerSent: true } : dev
        )
      )
      setOfferTarget(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send offer"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
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
                            onClick={() => openOffer(developer)}
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

      <Dialog open={!!offerTarget} onOpenChange={(open) => { if (!open) closeOffer() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Send offer to {offerTarget?.name}</DialogTitle>
            <DialogDescription>
              Fill in the offer details below. The developer will receive this in their inbox.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {teamsError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {teamsError}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="team_id">Team</Label>
                <Select
                  value={form.team_id}
                  onValueChange={handleTeamChange}
                  disabled={!teams || teams.length === 0}
                >
                  <SelectTrigger id="team_id" className="w-full">
                    <SelectValue
                      placeholder={
                        teams === null
                          ? "Loading teams..."
                          : teams.length === 0
                          ? "No teams found"
                          : "Select a team"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="job_posting_id">Job Posting</Label>
                <Select
                  value={form.job_posting_id}
                  onValueChange={(value) => updateField("job_posting_id", value)}
                  disabled={!selectedTeam || openPostings.length === 0}
                >
                  <SelectTrigger id="job_posting_id" className="w-full">
                    <SelectValue
                      placeholder={
                        !selectedTeam
                          ? "Select a team first"
                          : openPostings.length === 0
                          ? "No open postings"
                          : "Select a posting"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {openPostings.map((posting) => (
                      <SelectItem key={posting.id} value={posting.id}>
                        {posting.title} — {posting.required_role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="recipient_id">Recipient User ID</Label>
                <Input
                  id="recipient_id"
                  type="number"
                  value={form.recipient_id}
                  onChange={(e) => updateField("recipient_id", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proposed_role">Proposed Role</Label>
                <Input
                  id="proposed_role"
                  placeholder="e.g. Frontend Engineer"
                  value={form.proposed_role}
                  onChange={(e) => updateField("proposed_role", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="team_introduction">Team Introduction</Label>
              <Textarea
                id="team_introduction"
                placeholder="Briefly introduce your team and project"
                rows={3}
                value={form.team_introduction}
                onChange={(e) => updateField("team_introduction", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expected_contributions">Expected Contributions</Label>
              <Textarea
                id="expected_contributions"
                placeholder="What will this developer work on?"
                rows={3}
                value={form.expected_contributions}
                onChange={(e) => updateField("expected_contributions", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="compensation_details">Compensation Details</Label>
              <Textarea
                id="compensation_details"
                placeholder="Optional"
                rows={2}
                value={form.compensation_details}
                onChange={(e) => updateField("compensation_details", e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeOffer} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Offer
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}
