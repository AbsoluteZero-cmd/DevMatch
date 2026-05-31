"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Briefcase,
  Check,
  Clock,
  Loader2,
  Send,
  User as UserIcon,
  X,
} from "lucide-react"
import {
  acceptApplication,
  declineApplication,
  getApplication,
  getPostingApplications,
  type ApplicationOfferPayload,
  type PostingApplicationOut,
} from "@/lib/api"

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  reviewing: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function emptyOffer(role?: string): ApplicationOfferPayload {
  return {
    team_introduction: "",
    proposed_role: role ?? "",
    expected_contributions: "",
    compensation_details: "",
  }
}

export default function PostingApplicationsPage() {
  const params = useParams<{ postingId: string }>()
  const postingId = params?.postingId ?? ""

  const [title, setTitle] = useState("")
  const [applications, setApplications] = useState<PostingApplicationOut[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [reviewingId, setReviewingId] = useState<number | null>(null)
  const [decliningId, setDecliningId] = useState<number | null>(null)

  const [acceptTarget, setAcceptTarget] = useState<PostingApplicationOut | null>(null)
  const [offer, setOffer] = useState<ApplicationOfferPayload>(emptyOffer())
  const [submitting, setSubmitting] = useState(false)
  const [offerError, setOfferError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!postingId) return
    try {
      const data = await getPostingApplications(postingId)
      setTitle(data.job_posting_title)
      setApplications(data.applications)
      setError(null)
    } catch (err) {
      const status = (err as { status?: number })?.status
      setApplications([])
      setError(
        status === 403
          ? "Only the team leader can view applications for this posting."
          : "Could not load applications.",
      )
    }
  }, [postingId])

  useEffect(() => {
    load()
  }, [load])

  const toggleApplication = async (application: PostingApplicationOut) => {
    const next = openId === application.id ? null : application.id
    setOpenId(next)

    // First time a leader opens a pending application: mark reviewing + start DM (FR-63)
    if (next !== null && application.status === "pending") {
      setReviewingId(application.id)
      try {
        await getApplication(application.id)
        await load()
      } catch {
        // opening details should not hard-fail
      } finally {
        setReviewingId(null)
      }
    }
  }

  const handleDecline = async (application: PostingApplicationOut) => {
    setDecliningId(application.id)
    try {
      await declineApplication(application.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline application")
    } finally {
      setDecliningId(null)
    }
  }

  const openAccept = (application: PostingApplicationOut) => {
    setAcceptTarget(application)
    setOffer(emptyOffer(application.applicant.roles[0]))
    setOfferError(null)
  }

  const submitAccept = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!acceptTarget) return
    setSubmitting(true)
    setOfferError(null)
    try {
      await acceptApplication(acceptTarget.id, offer)
      setAcceptTarget(null)
      await load()
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : "Failed to accept application")
    } finally {
      setSubmitting(false)
    }
  }

  const updateOffer = (key: keyof ApplicationOfferPayload, value: string) =>
    setOffer((prev) => ({ ...prev, [key]: value }))

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">
          {title || "Job Posting"} — Applications
        </h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Review applicants, open one to see their details and start a DM, then accept or decline.
      </p>

      <div className="mt-6 space-y-3">
        {error ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
            {error}
          </div>
        ) : applications === null ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            No applications for this posting yet.
          </div>
        ) : (
          applications.map((application) => {
            const isOpen = openId === application.id
            const hasNoProfileInfo =
              application.applicant.roles.length === 0 &&
              application.applicant.skills.length === 0

            return (
              <Card key={application.id} className="border-border bg-card">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => toggleApplication(application)}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {application.applicant.full_name ??
                            `Applicant ${application.applicant_id}`}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Applied {formatDate(application.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {reviewingId === application.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Badge
                        className={cn(
                          "capitalize",
                          statusStyles[application.status] ??
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {application.status}
                      </Badge>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border p-4">
                      <div className="space-y-3">
                        {application.applicant.roles.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Roles</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {application.applicant.roles.map((role) => (
                                <span
                                  key={role}
                                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {application.applicant.skills.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Skills</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {application.applicant.skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {hasNoProfileInfo && (
                          <p className="text-sm text-muted-foreground">
                            This developer has not added roles or skills yet.
                          </p>
                        )}
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Send className="h-3.5 w-3.5" />
                          A direct message thread with this applicant is now available in your
                          Inbox.
                        </p>
                      </div>

                      {application.status !== "declined" &&
                        application.status !== "cancelled" && (
                        <div className="mt-4 flex gap-2">
                          {application.status !== "accepted" && (
                            <Button
                              size="sm"
                              className="gap-2"
                              onClick={() => openAccept(application)}
                            >
                              <Check className="h-4 w-4" />
                              Accept
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleDecline(application)}
                            disabled={decliningId === application.id}
                          >
                            {decliningId === application.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Dialog
        open={!!acceptTarget}
        onOpenChange={(open) => {
          if (!open && !submitting) setAcceptTarget(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Accept {acceptTarget?.applicant.full_name ?? "applicant"}
            </DialogTitle>
            <DialogDescription>
              Accepting sends a formal offer (valid 7 days) to the developer.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitAccept} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="proposed_role">Proposed Role</Label>
              <Input
                id="proposed_role"
                placeholder="e.g. Frontend Engineer"
                value={offer.proposed_role}
                onChange={(e) => updateOffer("proposed_role", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team_introduction">Team Introduction</Label>
              <Textarea
                id="team_introduction"
                rows={3}
                placeholder="Briefly introduce your team and project"
                value={offer.team_introduction}
                onChange={(e) => updateOffer("team_introduction", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expected_contributions">Expected Contributions</Label>
              <Textarea
                id="expected_contributions"
                rows={3}
                placeholder="What will this developer work on?"
                value={offer.expected_contributions}
                onChange={(e) => updateOffer("expected_contributions", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compensation_details">Compensation Details</Label>
              <Textarea
                id="compensation_details"
                rows={2}
                placeholder="Optional"
                value={offer.compensation_details}
                onChange={(e) => updateOffer("compensation_details", e.target.value)}
              />
            </div>

            {offerError && <p className="text-sm text-destructive">{offerError}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAcceptTarget(null)}
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
                    <Check className="h-4 w-4" />
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
