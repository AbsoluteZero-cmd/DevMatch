"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Send, X, ArrowLeft } from "lucide-react"

type OfferStatus = "Pending" | "Interested" | "Declined"

interface Offer {
  id: string
  teamName: string
  teamAvatar: string
  role: string
  status: OfferStatus
  message: string
  timestamp: string
  messages: { from: "team" | "user"; text: string; time: string }[]
}

const initialOffers: Offer[] = [
  {
    id: "1",
    teamName: "Team Phoenix",
    teamAvatar: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400&h=400&fit=crop",
    role: "Full Stack Developer",
    status: "Pending",
    message: "We loved your portfolio! Would you be interested in joining our team for a hackathon project?",
    timestamp: "2h ago",
    messages: [
      { from: "team", text: "Hi! We saw your profile and were really impressed with your projects.", time: "2h ago" },
      { from: "team", text: "We loved your portfolio! Would you be interested in joining our team for a hackathon project?", time: "2h ago" },
    ],
  },
  {
    id: "2",
    teamName: "DataMinds",
    teamAvatar: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=400&fit=crop",
    role: "ML Engineer",
    status: "Pending",
    message: "Looking for someone with your ML skills for our AI startup project.",
    timestamp: "1d ago",
    messages: [
      { from: "team", text: "Hello! Your machine learning experience caught our attention.", time: "1d ago" },
      { from: "team", text: "Looking for someone with your ML skills for our AI startup project.", time: "1d ago" },
    ],
  },
  {
    id: "3",
    teamName: "WebCrafters",
    teamAvatar: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=400&fit=crop",
    role: "Frontend Developer",
    status: "Interested",
    message: "Great to have you on board! Let's schedule a call to discuss the project.",
    timestamp: "3d ago",
    messages: [
      { from: "team", text: "We need a React expert for our e-commerce platform.", time: "3d ago" },
      { from: "user", text: "That sounds interesting! I'd love to learn more.", time: "3d ago" },
      { from: "team", text: "Great to have you on board! Let's schedule a call to discuss the project.", time: "2d ago" },
    ],
  },
  {
    id: "4",
    teamName: "CloudNine",
    teamAvatar: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=400&fit=crop",
    role: "Backend Developer",
    status: "Declined",
    message: "Thanks for considering us. Good luck with your search!",
    timestamp: "1w ago",
    messages: [
      { from: "team", text: "We have an exciting cloud infrastructure project.", time: "1w ago" },
      { from: "user", text: "Thanks for the offer, but I'm currently focused on frontend work.", time: "1w ago" },
      { from: "team", text: "Thanks for considering us. Good luck with your search!", time: "1w ago" },
    ],
  },
]

const statusStyles: Record<OfferStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Interested: "bg-green-100 text-green-700",
  Declined: "bg-red-100 text-red-700",
}

export default function InboxPage() {
  const [offers, setOffers] = useState(initialOffers)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [newMessage, setNewMessage] = useState("")

  const handleStatusChange = (offerId: string, status: OfferStatus) => {
    setOffers(current =>
      current.map(offer =>
        offer.id === offerId ? { ...offer, status } : offer
      )
    )
    if (selectedOffer?.id === offerId) {
      setSelectedOffer({ ...selectedOffer, status })
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedOffer) return

    const updatedOffer = {
      ...selectedOffer,
      messages: [
        ...selectedOffer.messages,
        { from: "user" as const, text: newMessage, time: "Just now" },
      ],
    }

    setOffers(current =>
      current.map(offer =>
        offer.id === selectedOffer.id ? updatedOffer : offer
      )
    )
    setSelectedOffer(updatedOffer)
    setNewMessage("")
  }

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
            {/* Offers List */}
            <div className={cn(
              "space-y-3 lg:col-span-2",
              selectedOffer && "hidden lg:block"
            )}>
              {offers.map((offer) => (
                <Card
                  key={offer.id}
                  onClick={() => setSelectedOffer(offer)}
                  className={cn(
                    "cursor-pointer border-border bg-card transition-all hover:border-primary/30 hover:shadow-sm",
                    selectedOffer?.id === offer.id && "border-primary bg-primary/5"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage src={offer.teamAvatar} alt={offer.teamName} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {offer.teamName.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">{offer.teamName}</h3>
                            <p className="text-sm text-primary">{offer.role}</p>
                          </div>
                          <Badge className={cn("shrink-0", statusStyles[offer.status])}>
                            {offer.status}
                          </Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {offer.message}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">{offer.timestamp}</p>
                        
                        {/* Action Buttons for Pending offers */}
                        {offer.status === "Pending" && (
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange(offer.id, "Interested")
                              }}
                            >
                              Interested
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange(offer.id, "Declined")
                              }}
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chat Window */}
            <div className={cn(
              "lg:col-span-3",
              !selectedOffer && "hidden lg:block"
            )}>
              {selectedOffer ? (
                <Card className="flex h-[600px] flex-col border-border bg-card">
                  {/* Chat Header */}
                  <div className="flex items-center gap-3 border-b border-border p-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setSelectedOffer(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedOffer.teamAvatar} alt={selectedOffer.teamName} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {selectedOffer.teamName.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{selectedOffer.teamName}</h3>
                      <p className="text-sm text-muted-foreground">{selectedOffer.role}</p>
                    </div>
                    <Badge className={statusStyles[selectedOffer.status]}>
                      {selectedOffer.status}
                    </Badge>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                      {selectedOffer.messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex",
                            msg.from === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-2",
                              msg.from === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            )}
                          >
                            <p className="text-sm">{msg.text}</p>
                            <p className={cn(
                              "mt-1 text-xs",
                              msg.from === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {msg.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-border p-4">
                    {selectedOffer.status === "Pending" && (
                      <div className="mb-3 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleStatusChange(selectedOffer.id, "Interested")}
                        >
                          Interested
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleStatusChange(selectedOffer.id, "Declined")}
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
                      />
                      <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
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
