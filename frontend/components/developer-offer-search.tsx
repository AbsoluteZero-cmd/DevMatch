"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2, Send } from "lucide-react"
import {
  getCurrentUser,
  getRecommendations,
  listMyTeams,
  sendOffer,
  type CandidateRead,
  type TeamSummary,
} from "@/lib/api"

interface CurrentUser {
  id: number
}

interface OfferForm {
  proposed_role: string
  team_introduction: string
  expected_contributions: string
  compensation_details: string
}

function initials(name: string | null) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function emptyOffer(role?: string): OfferForm {
  return {
    proposed_role: role ?? "",
    team_introduction: "",
    expected_contributions: "",
    compensation_details: "",
  }
}

/**
 * Team-leader developer search: pick one of your led teams + an open posting,
 * browse recommended developers, open a developer's profile, or send an offer.
 */
export function DeveloperOfferSearch({ query }: { query: string }) {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [teams, setTeams] = useState<TeamSummary[] | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [selectedPostingId, setSelectedPostingId] = useState("")
  const [candidates, setCandidates] = useState<CandidateRead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [offerTarget, setOfferTarget] = useState<CandidateRead | null>(null)
  const [form, setForm] = useState<OfferForm>(emptyOffer())
  const [submitting, setSubmitting] = useState(false)
  const [offerError, setOfferError] = useState<string | null>(null)
  const [sentUserIds, setSentUserIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    let cancelled = false
    Promise.all([getCurrentUser<CurrentUser>(), listMyTeams()])
      .then(([user, myTeams]) => {
        if (cancelled) return
        setCurrentUserId(user.id)
        setTeams(myTeams)
      })
      .catch(() => {
        if (!cancelled) setTeams([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const ledTeams = useMemo(
    () =>
      (teams ?? []).filter(
        (team) => currentUserId !== null && team.leader_id === currentUserId,
      ),
    [teams, currentUserId],
  )

  useEffect(() => {
    if (ledTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(ledTeams[0].id)
    }
  }, [ledTeams, selectedTeamId])

  const selectedTeam = ledTeams.find((team) => team.id === selectedTeamId) ?? null
  const openPostings =
    selectedTeam?.job_postings.filter((posting) => posting.status === "OPEN") ?? []

  useEffect(() => {
    if (!selectedTeam) {
      setSelectedPostingId("")
      return
    }
    if (!openPostings.some((posting) => posting.id === selectedPostingId)) {
      setSelectedPostingId(openPostings[0]?.id ?? "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, selectedTeam])

  useEffect(() => {
    if (!selectedTeamId || !selectedPostingId) {
      setCandidates([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getRecommendations(selectedTeamId, selectedPostingId)
      .then((recs) => {
        if (!cancelled) setCandidates(recs)
      })
      .catch(() => {
        if (cancelled) return
        setCandidates([])
        setError("Could not load recommended developers.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedTeamId, selectedPostingId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter((candidate) =>
      [
        candidate.full_name ?? "",
        ...candidate.roles.map((r) => r.name),
        ...candidate.skill_tags.map((s) => s.name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [candidates, query])

  const openOffer = (candidate: CandidateRead) => {
    setOfferTarget(candidate)
    setForm(emptyOffer(candidate.roles[0]?.name))
    setOfferError(null)
  }

  const submitOffer = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!offerTarget || offerTarget.user_id == null) return
    setSubmitting(true)
    setOfferError(null)
    try {
      await sendOffer({
        team_id: selectedTeamId,
        recipient_id: offerTarget.user_id,
        job_posting_id: selectedPostingId,
        proposed_role: form.proposed_role.trim() || undefined,
        team_introduction: form.team_introduction.trim() || undefined,
        expected_contributions: form.expected_contributions.trim() || undefined,
        compensation_details: form.compensation_details.trim() || undefined,
      })
      setSentUserIds((prev) => new Set(prev).add(offerTarget.user_id as number))
      setOfferTarget(null)
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : "Failed to send offer")
    } finally {
      setSubmitting(false)
    }
  }

  if (teams === null) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (ledTeams.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6 text-sm text-muted-foreground">
          You don&apos;t lead any teams yet. Create a team from your dashboard to
          start sending offers to developers.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block text-xs font-medium text-muted-foreground">
            Team
          </Label>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {ledTeams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-xs font-medium text-muted-foreground">
            Open posting
          </Label>
          <Select
            value={selectedPostingId}
            onValueChange={setSelectedPostingId}
            disabled={openPostings.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  openPostings.length === 0 ? "No open postings" : "Select a posting"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {openPostings.map((posting) => (
                <SelectItem key={posting.id} value={posting.id}>
                  {posting.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedPostingId ? (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Select a team with an open job posting to see recommended developers.
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No recommended developers match your search for this posting.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((candidate) => {
            const alreadySent =
              candidate.user_id != null && sentUserIds.has(candidate.user_id)
            return (
              <Card
                key={candidate.profile_id}
                className="border-border bg-card transition-all hover:border-primary/30 hover:shadow-md"
              >
                <CardContent className="space-y-4 p-6">
                  {/* The person area links to their profile */}
                  <Link
                    href={`/developers/${candidate.profile_id}`}
                    className="block space-y-4 rounded-lg outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {initials(candidate.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground hover:underline">
                          {candidate.full_name ?? "Anonymous developer"}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Match score {Math.round(candidate.match_score)}
                        </p>
                      </div>
                    </div>

                    {candidate.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.roles.map((role) => (
                          <span
                            key={role.id}
                            className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          >
                            {role.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {candidate.skill_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.skill_tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>

                  <Button
                    className="w-full justify-center gap-2"
                    size="sm"
                    variant={alreadySent ? "outline" : "default"}
                    disabled={alreadySent || candidate.user_id == null}
                    onClick={() => openOffer(candidate)}
                  >
                    {alreadySent ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Offer Sent
                      </>
                    ) : candidate.user_id == null ? (
                      "No user id available"
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Offer
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={!!offerTarget}
        onOpenChange={(open) => {
          if (!open && !submitting) setOfferTarget(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Send offer to {offerTarget?.full_name ?? "developer"}
            </DialogTitle>
            <DialogDescription>
              The developer will receive this offer in their inbox.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitOffer} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="proposed_role">Proposed Role</Label>
              <Textarea
                id="proposed_role"
                rows={1}
                placeholder="e.g. Frontend Engineer"
                value={form.proposed_role}
                onChange={(e) => setForm((s) => ({ ...s, proposed_role: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team_introduction">Team Introduction</Label>
              <Textarea
                id="team_introduction"
                rows={3}
                placeholder="Briefly introduce your team and project"
                value={form.team_introduction}
                onChange={(e) =>
                  setForm((s) => ({ ...s, team_introduction: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expected_contributions">Expected Contributions</Label>
              <Textarea
                id="expected_contributions"
                rows={3}
                placeholder="What will this developer work on?"
                value={form.expected_contributions}
                onChange={(e) =>
                  setForm((s) => ({ ...s, expected_contributions: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compensation_details">Compensation Details</Label>
              <Textarea
                id="compensation_details"
                rows={2}
                placeholder="Optional"
                value={form.compensation_details}
                onChange={(e) =>
                  setForm((s) => ({ ...s, compensation_details: e.target.value }))
                }
              />
            </div>

            {offerError && <p className="text-sm text-destructive">{offerError}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOfferTarget(null)}
                disabled={submitting}
              >
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
    </div>
  )
}
