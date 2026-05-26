"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Send, ArrowLeft, Loader2, Inbox } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  getInbox,
  acceptChatInvite,
  declineChatInvite,
  getRoomMessages,
  sendRoomMessage,
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
}

interface ChatMessage {
  id: number
  room_id: number
  user_id: number
  content: string
  message_type: string
  created_at: string
}

type DisplayStatus = "Pending" | "Accepted" | "Declined"

function toDisplayStatus(status: string): DisplayStatus {
  if (status === "accepted") return "Accepted"
  if (status === "declined") return "Declined"
  return "Pending"
}

const statusStyles: Record<DisplayStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Accepted: "bg-green-100 text-green-700",
  Declined: "bg-red-100 text-red-700",
}

export default function InboxPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<InboxItem[]>([])
  const [selected, setSelected] = useState<InboxItem | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getInbox<InboxItem[]>()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleAccept = async (item: InboxItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await acceptChatInvite(item.room_id)
      const updated = { ...item, status: "accepted" }
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      if (selected?.id === item.id) setSelected(updated)
    } catch {}
  }

  const handleDecline = async (item: InboxItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await declineChatInvite(item.room_id)
      const updated = { ...item, status: "declined" }
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      if (selected?.id === item.id) setSelected(updated)
    } catch {}
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selected || sending) return

    setSending(true)
    try {
      const msg = await sendRoomMessage<ChatMessage>(selected.room_id, newMessage.trim())
      setMessages(prev => [...prev, msg])
      setItems(prev =>
        prev.map(i =>
          i.id === selected.id ? { ...i, last_message: msg.content } : i
        )
      )
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

  const displayStatus = selected ? toDisplayStatus(selected.status) : "Pending"

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Offers & Messages</h1>
          <p className="mt-1 text-muted-foreground">
            Manage team offers and chat with recruiters
          </p>
        </div>

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
                const status = toDisplayStatus(item.status)
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
                            <Badge className={cn("shrink-0", statusStyles[status])}>
                              {status}
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

                          {status === "Pending" && (
                            <div className="mt-3 flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={(e) => handleAccept(item, e)}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={(e) => handleDecline(item, e)}
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
                  <Badge className={statusStyles[displayStatus]}>
                    {displayStatus}
                  </Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {messagesLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isMe = user && msg.user_id === Number(user.id)
                        return (
                          <div
                            key={msg.id}
                            className={cn("flex", isMe ? "justify-end" : "justify-start")}
                          >
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
                  {displayStatus === "Pending" && (
                    <div className="mb-3 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleAccept(selected)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleDecline(selected)}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                      disabled={sending}
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
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
      </div>
    </main>
  )
}
