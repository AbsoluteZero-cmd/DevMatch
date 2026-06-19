"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Send, ArrowLeft, Loader2, Inbox, Briefcase } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useUnread } from "@/contexts/unread-context"
import {
  API_URL,
  getInbox,
  markInterested,
  declineChatInvite,
  joinTeam,
  cancelJoin,
  getRoomMessages,
  sendRoomMessage,
  getMyApplications,
  type DeveloperApplicationOut,
  type ApplicationStatus,
} from "@/lib/api"

interface InboxItem {
  id: number
  room_id: number
  room_name: string
  room_description: string
  status: string
  role: string | null
  invited_at: string
  created_by_id: number
  created_by_name: string
  last_message: string | null
  last_message_at: string | null
  offer_status: string | null
  team_id: string | null
  job_posting_id: string | null
  team_introduction: string | null
  proposed_role: string | null
  expected_contributions: string | null
  compensation_details: string | null
  expires_at: string | null
}

interface ChatMessage {
  id: number
  room_id: number
  user_id: number
  full_name?: string | null
  content: string
  message_type: string
  created_at: string
}

type Phase =
  | "pending"
  | "interested"
  | "joined"
  | "declined"
  | "chat"
  | "readonly"

function getPhase(item: InboxItem | null, currentUserId: number | null): Phase {
  if (!item) return "readonly"
  const isRecipient = currentUserId !== null && item.created_by_id !== currentUserId
  const hasOffer = !!item.offer_status

  if (item.status === "declined") return "declined"
  if (hasOffer && item.offer_status === "declined") return "declined"
  if (hasOffer && item.offer_status === "cancelled") return "declined"
  if (hasOffer && item.offer_status === "expired") return "readonly"

  if (hasOffer && isRecipient) {
    if (item.status === "pending") return "pending"
    if (item.offer_status === "accepted") return "joined"
    if (item.offer_status === "interested") return "interested"
    return "chat"
  }

  if (item.status === "pending") return "pending"
  return "chat"
}

function statusBadge(item: InboxItem | null): { label: string; className: string } {
  if (!item) return { label: "Pending", className: "bg-amber-100 text-amber-700" }
  if (item.offer_status === "accepted") return { label: "Joined", className: "bg-green-100 text-green-700" }
  if (item.offer_status === "interested") return { label: "Interested", className: "bg-blue-100 text-blue-700" }
  if (item.offer_status === "declined" || item.status === "declined") return { label: "Declined", className: "bg-red-100 text-red-700" }
  if (item.offer_status === "cancelled") return { label: "Cancelled", className: "bg-muted text-muted-foreground" }
  if (item.offer_status === "expired") return { label: "Expired", className: "bg-gray-100 text-gray-600" }
  if (item.status === "accepted") return { label: "Accepted", className: "bg-green-100 text-green-700" }
  return { label: "Pending", className: "bg-amber-100 text-amber-700" }
}

const applicationStatusStyles: Record<ApplicationStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  reviewing: { label: "Reviewing", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-700" },
  declined: { label: "Declined", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  withdrawn: { label: "Withdrawn", className: "bg-muted text-muted-foreground" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
}

function applicationBadge(status: ApplicationStatus) {
  return applicationStatusStyles[status] ?? { label: status, className: "bg-muted text-muted-foreground" }
}

export default function InboxPage() {
  const { user, accessToken } = useAuth()
  const { clear: clearUnread } = useUnread()
  const [items, setItems] = useState<InboxItem[]>([])
  const [selected, setSelected] = useState<InboxItem | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState<"offers" | "applications">("offers")
  const [applications, setApplications] = useState<DeveloperApplicationOut[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)

  const currentUserId = user ? Number(user.id) : null

  const socketRef = useRef<WebSocket | null>(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const userRef = useRef(user)
  userRef.current = user

  useEffect(() => {
    if (!accessToken) return

    const wsBaseUrl = API_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '')
    const ws = new WebSocket(`${wsBaseUrl}/ws/inbox?token=${accessToken}`)
    socketRef.current = ws

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "new_message") {
        const currentUser = userRef.current
        const currentSelected = selectedRef.current
        if (currentUser && data.user_id === Number(currentUser.id)) return

        if (currentSelected && data.room_id === currentSelected.room_id) {
          setMessages((prev: ChatMessage[]) => {
            if (prev.some((m) => m.id === data.message_id)) return prev
            return [
              ...prev,
              {
                id: data.message_id,
                room_id: data.room_id,
                user_id: data.user_id,
                full_name: data.full_name ?? null,
                content: data.content,
                message_type: data.message_type || "text",
                created_at: data.timestamp,
              },
            ]
          })
        }
        setItems((prev: InboxItem[]) => {
          const updated = prev.map((i: InboxItem) =>
            i.room_id === data.room_id
              ? { ...i, last_message: data.content, last_message_at: data.timestamp }
              : i
          )
          updated.sort((a, b) => {
            const ta = a.last_message_at || a.invited_at
            const tb = b.last_message_at || b.invited_at
            return new Date(tb).getTime() - new Date(ta).getTime()
          })
          return updated
        })
        // Being on the inbox counts as read; the global unread badge is
        // managed by UnreadProvider (so it works from any page).
        clearUnread()
      }

      if (data.type === "inbox_invite" || data.type === "new_offer") {
        getInbox<InboxItem[]>().then(setItems).catch(() => {})
      }

      if (data.type === "Interested in offer" || data.type === "Offer accepted" || data.type === "Offer declined") {
        getInbox<InboxItem[]>()
          .then((fresh) => {
            setItems(fresh)
            const sel = selectedRef.current
            if (sel) {
              const updated = fresh.find((i) => i.room_id === sel.room_id)
              if (updated) setSelected(updated)
            }
          })
          .catch(() => {})
      }
    }

    return () => {
      ws.close()
      socketRef.current = null
    }
  }, [accessToken])

  useEffect(() => {
    getInbox<InboxItem[]>()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
    clearUnread()
  }, [])

  useEffect(() => {
    if (!selected) {
      setMessages([])
      return
    }
    setMessagesLoading(true)
    getRoomMessages<ChatMessage[]>(selected.room_id)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false))
  }, [selected?.room_id])

  useEffect(() => {
    if (activeTab !== "applications") return
    setApplicationsLoading(true)
    getMyApplications()
      .then(setApplications)
      .catch(() => setApplications([]))
      .finally(() => setApplicationsLoading(false))
  }, [activeTab])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const refreshSelected = (updates: Partial<InboxItem>) => {
    if (!selected) return
    const merged = { ...selected, ...updates }
    setSelected(merged)
    setItems((prev) => prev.map((i) => (i.id === selected.id ? merged : i)))
  }

  const handleInterested = async (item: InboxItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActionLoading(true)
    try {
      await markInterested(item.room_id)
      const updates = { status: "accepted", offer_status: "interested" }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...updates } : i)))
      if (selected?.id === item.id) setSelected({ ...item, ...updates })
    } catch {}
    setActionLoading(false)
  }

  const handleDecline = async (item: InboxItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActionLoading(true)
    try {
      await declineChatInvite(item.room_id)
      const updates = { status: "declined", offer_status: "declined" }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...updates } : i)))
      if (selected?.id === item.id) setSelected({ ...item, ...updates })
    } catch {}
    setActionLoading(false)
  }

  const handleJoin = async (item: InboxItem) => {
    setActionLoading(true)
    try {
      await joinTeam(item.room_id)
      refreshSelected({ offer_status: "accepted" })
    } catch {}
    setActionLoading(false)
  }

  const handleCancelJoin = async (item: InboxItem) => {
    setActionLoading(true)
    try {
      await cancelJoin(item.room_id)
      refreshSelected({ offer_status: "cancelled" })
    } catch {}
    setActionLoading(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selected || sending) return

    setSending(true)
    try {
      const msg = await sendRoomMessage<ChatMessage>(selected.room_id, newMessage.trim())
      setMessages((prev) => [...prev, msg])
      setItems((prev: InboxItem[]) => {
        const updated = prev.map((i: InboxItem) =>
          i.id === selected.id
            ? { ...i, last_message: msg.content, last_message_at: msg.created_at }
            : i
        )
        updated.sort((a: InboxItem, b: InboxItem) => {
          const ta = a.last_message_at || a.invited_at
          const tb = b.last_message_at || b.invited_at
          return new Date(tb).getTime() - new Date(ta).getTime()
        })
        return updated
      })
      setNewMessage("")
    } catch {}
    setSending(false)
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    )
  }

  const selectedPhase = getPhase(selected, currentUserId)
  const selectedBadge = statusBadge(selected)
  const canChat = selected !== null && (selectedPhase === "interested" || selectedPhase === "joined" || selectedPhase === "chat")
  const hasOfferDetails = selected !== null && !!selected.offer_status

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Offers & Messages</h1>
            <p className="mt-1 text-muted-foreground">
              Manage team offers and chat with recruiters
            </p>
          </div>
          <div className="flex rounded-lg border border-border bg-muted p-1">
            <button
              onClick={() => { setActiveTab("offers"); setSelected(null) }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "offers"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Offers
            </button>
            <button
              onClick={() => { setActiveTab("applications"); setSelected(null) }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "applications"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              My Applications
            </button>
          </div>
        </div>

        {activeTab === "applications" && (
          <div className="space-y-4">
            {(() => {
              const activeCount = applications.filter((a) => a.status === "pending" || a.status === "reviewing").length
              return (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {applications.length} application{applications.length === 1 ? "" : "s"} total
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">Active:</p>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          activeCount >= 5 ? "bg-red-500" : activeCount >= 3 ? "bg-amber-500" : "bg-green-500",
                        )}
                        style={{ width: `${(activeCount / 5) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs font-medium text-foreground">{activeCount}/5</p>
                  </div>
                </div>
              )
            })()}

            {applicationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : applications.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No applications yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Browse teams in Search to apply to open positions.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const badge = applicationBadge(app.status)
                  return (
                    <Card key={app.id} className="border-border bg-card">
                      <CardContent className="flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            Application #{app.id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Posting {app.job_posting_id.slice(0, 8)}... &middot;{" "}
                            {new Date(app.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={cn("shrink-0", badge.className)}>
                          {badge.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "offers" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className={cn(
            "space-y-3 lg:col-span-2",
            selected && "hidden lg:block"
          )}>
            {items.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No offers yet</p>
                </CardContent>
              </Card>
            ) : (
              items.map((item) => {
                const phase = getPhase(item, currentUserId)
                const badge = statusBadge(item)
                return (
                  <Card
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className={cn(
                      "cursor-pointer border-border bg-card transition-all hover:border-primary/30 hover:shadow-sm",
                      selected?.id === item.id && "border-primary bg-primary/5"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {item.created_by_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-foreground">{item.room_name}</h3>
                              {item.role && <p className="text-sm text-primary">{item.role}</p>}
                            </div>
                            <Badge className={cn("shrink-0", badge.className)}>
                              {badge.label}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            From {item.created_by_name}
                          </p>
                          {item.last_message && (
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                              {item.last_message}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(item.invited_at).toLocaleDateString()}
                          </p>
                          {item.offer_status === "pending" && item.expires_at && (
                            <p className="text-xs text-amber-600">
                              Expires {new Date(item.expires_at).toLocaleDateString()}
                            </p>
                          )}

                          {phase === "pending" && (
                            <div className="mt-3 flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={(e) => handleInterested(item, e)}
                                disabled={actionLoading}
                              >
                                Interested
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={(e) => handleDecline(item, e)}
                                disabled={actionLoading}
                              >
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          <div className={cn(
            "lg:col-span-3",
            !selected && "hidden lg:block"
          )}>
            {selected ? (
              <Card className="flex h-[600px] flex-col border-border bg-card">
                <div className="flex items-center gap-3 border-b border-border p-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSelected(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {selected.created_by_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{selected.room_name}</h3>
                    {selected.role && (
                      <p className="text-sm text-muted-foreground">{selected.role}</p>
                    )}
                  </div>
                  <Badge className={selectedBadge.className}>{selectedBadge.label}</Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {messagesLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {hasOfferDetails && (
                        <Card className="border-primary/30 bg-primary/5">
                          <CardContent className="space-y-2 p-4">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-semibold text-foreground">Offer Details</h4>
                            </div>
                            {selected.proposed_role && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Proposed role</p>
                                <p className="text-sm text-foreground">{selected.proposed_role}</p>
                              </div>
                            )}
                            {selected.team_introduction && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Team introduction</p>
                                <p className="text-sm whitespace-pre-wrap text-foreground">{selected.team_introduction}</p>
                              </div>
                            )}
                            {selected.expected_contributions && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Expected contributions</p>
                                <p className="text-sm whitespace-pre-wrap text-foreground">{selected.expected_contributions}</p>
                              </div>
                            )}
                            {selected.compensation_details && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Compensation</p>
                                <p className="text-sm whitespace-pre-wrap text-foreground">{selected.compensation_details}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {messages.length === 0 && !hasOfferDetails && (
                        <div className="flex h-full items-center justify-center">
                          <p className="text-sm text-muted-foreground">No messages yet</p>
                        </div>
                      )}

                      {messages.map((msg) => {
                        const isMe = user && msg.user_id === Number(user.id)
                        const senderName = isMe
                          ? user?.full_name ?? "You"
                          : msg.full_name ?? selected.created_by_name
                        return (
                          <div
                            key={msg.id}
                            className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
                          >
                            <span className="mb-0.5 px-1 text-xs font-medium text-muted-foreground">
                              {senderName}
                            </span>
                            <div
                              className={cn(
                                "max-w-[80%] rounded-2xl px-4 py-2",
                                isMe
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              )}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className={cn(
                                "mt-1 text-xs",
                                isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="border-t border-border p-4">
                  {selectedPhase === "pending" && (
                    <div className="mb-3 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleInterested(selected)}
                        disabled={actionLoading}
                      >
                        Interested
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleDecline(selected)}
                        disabled={actionLoading}
                      >
                        Decline
                      </Button>
                    </div>
                  )}

                  {selectedPhase === "interested" && (
                    <div className="mb-3 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleJoin(selected)}
                        disabled={actionLoading}
                      >
                        Join Team
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleDecline(selected)}
                        disabled={actionLoading}
                      >
                        Decline
                      </Button>
                    </div>
                  )}

                  {selectedPhase === "joined" && (
                    <div className="mb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCancelJoin(selected)}
                        disabled={actionLoading}
                      >
                        Cancel Join
                      </Button>
                    </div>
                  )}

                  {selectedPhase === "declined" && (
                    <p className="mb-3 text-center text-sm text-muted-foreground">
                      This offer is no longer active.
                    </p>
                  )}

                  {selectedPhase === "readonly" && selected.offer_status === "expired" && (
                    <p className="mb-3 text-center text-sm text-muted-foreground">
                      This offer has expired after 7 days with no response.
                    </p>
                  )}

                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder={canChat ? "Type a message..." : "Mark interested to start chatting"}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                      disabled={sending || !canChat}
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim() || sending || !canChat}>
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </Card>
            ) : (
              <Card className="flex h-[600px] items-center justify-center border-border bg-card">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Send className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground">Select an offer</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose an offer from the list to view the conversation
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
        )}
      </div>
    </main>
  )
}
