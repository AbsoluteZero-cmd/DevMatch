"use client"

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { discoverTeams, applyToJob, getCurrentUser, type TeamDiscoveryRead } from "@/lib/api"
import { DeveloperOfferSearch } from "@/components/developer-offer-search"
import {
  Briefcase,
  Filter,
  GraduationCap,
  Globe,
  Lock,
  Loader2,
  Search as SearchIcon,
  Send,
  Sparkles,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

type DeveloperSearchResult = {
  id: string
  full_name: string
  university: string
  location: string
  roles: string[]
  skills: string[]
  experience: string
  avatar: string
  visible: boolean
}

const developerSeed: DeveloperSearchResult[] = [
  {
    id: "dev-1",
    full_name: "Alex Kim",
    university: "Seoul National University",
    location: "Seoul, South Korea",
    roles: ["Frontend Engineer", "Full-Stack Engineer"],
    skills: ["React", "TypeScript", "Design Systems"],
    experience: "3 years",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    visible: true,
  },
  {
    id: "dev-2",
    full_name: "Jordan Lee",
    university: "POSTECH",
    location: "Pohang, South Korea",
    roles: ["Backend Engineer", "DevOps / Infrastructure Engineer"],
    skills: ["FastAPI", "PostgreSQL", "AWS"],
    experience: "4 years",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    visible: true,
  },
  {
    id: "dev-3",
    full_name: "Taylor Park",
    university: "Yonsei University",
    location: "Seoul, South Korea",
    roles: ["ML / AI Engineer", "Data Scientist"],
    skills: ["PyTorch", "TensorFlow", "MLOps"],
    experience: "2 years",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    visible: true,
  },
  {
    id: "dev-4",
    full_name: "Mina Choi",
    university: "KAIST",
    location: "Daejeon, South Korea",
    roles: ["Security Engineer", "QA Engineer"],
    skills: ["AppSec", "Playwright", "CI/CD"],
    experience: "5 years",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
    visible: false,
  },
]

const teamFilters = ["Public", "Private", "With members", "Has description"]

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function visibilityBadge(visibility: string) {
  return visibility === "PRIVATE"
    ? { icon: Lock, label: "Private" }
    : { icon: Globe, label: "Public" }
}

export default function SearchPage() {
  const [searchMode, setSearchMode] = useState<"developers" | "teams">(
    "developers",
  )
  const [query, setQuery] = useState("")
  const [selectedTeamFilters, setSelectedTeamFilters] = useState<string[]>([
    "Public",
    "Private",
  ])
  const [selectedDeveloperFilters, setSelectedDeveloperFilters] = useState<
    string[]
  >(["Visible", "Hidden"])
  const [teams, setTeams] = useState<TeamDiscoveryRead[]>([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [appliedPostingIds, setAppliedPostingIds] = useState<Set<string>>(new Set())
  const [applyLoadingId, setApplyLoadingId] = useState<string | null>(null)
  const [applyMessage, setApplyMessage] = useState<{ postingId: string; text: string; isError: boolean } | null>(null)
  const [isLeader, setIsLeader] = useState(false)

  useEffect(() => {
    let cancelled = false
    getCurrentUser<{ role?: string }>()
      .then((u) => {
        if (!cancelled) setIsLeader(u.role === "TEAM_LEADER" || u.role === "ADMIN")
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const loadTeams = async () => {
      setTeamLoading(true)
      setTeamError(null)

      try {
        const data = await discoverTeams(query.trim() || undefined)
        if (isActive) {
          setTeams(data)
        }
      } catch (error) {
        if (isActive) {
          setTeams([])
          setTeamError(
            error instanceof Error ? error.message : "Failed to load teams.",
          )
        }
      } finally {
        if (isActive) {
          setTeamLoading(false)
        }
      }
    }

    if (searchMode === "teams") {
      void loadTeams()
    }

    return () => {
      isActive = false
    }
  }, [query, searchMode])

  const filteredDevelopers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return developerSeed.filter((developer) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          developer.full_name,
          developer.university,
          developer.location,
          developer.roles.join(" "),
          developer.skills.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)

      const matchesVisibility =
        (developer.visible && selectedDeveloperFilters.includes("Visible")) ||
        (!developer.visible && selectedDeveloperFilters.includes("Hidden"))

      return matchesQuery && matchesVisibility
    })
  }, [query, selectedDeveloperFilters])

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const visibility = team.visibility === "PRIVATE" ? "Private" : "Public"
      const matchesVisibility = selectedTeamFilters.includes(visibility)
      const matchesMembers =
        !selectedTeamFilters.includes("With members") || team.members.length > 0
      const matchesDescription =
        !selectedTeamFilters.includes("Has description") ||
        Boolean(team.description?.trim())

      return matchesVisibility && matchesMembers && matchesDescription
    })
  }, [selectedTeamFilters, teams])

  const toggleFilter = (
    value: string,
    setFilters: Dispatch<SetStateAction<string[]>>,
  ) => {
    setFilters((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    )
  }

  const handleApply = async (postingId: string) => {
    setApplyLoadingId(postingId)
    setApplyMessage(null)
    try {
      await applyToJob(postingId)
      setAppliedPostingIds((prev) => new Set(prev).add(postingId))
      setApplyMessage({ postingId, text: "Application submitted!", isError: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to apply"
      const detail = msg.includes("too many pending")
        ? "You have too many active applications (max 5)."
        : msg.includes("already applied")
          ? "You have already applied to this posting."
          : "Failed to submit application."
      setApplyMessage({ postingId, text: detail, isError: true })
    } finally {
      setApplyLoadingId(null)
    }
  }

  const toggleExpand = (teamId: string) => {
    setExpandedTeamId((prev) => (prev === teamId ? null : teamId))
    setApplyMessage(null)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Developer and team discovery
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Find developers or teams
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Search individual developers, or browse teams with privacy-aware
                previews for public and private projects.
              </p>
            </div>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>Both discovery paths are available from one place.</span>
              </div>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-3 py-1">Teams</span>
                <span className="rounded-full bg-muted px-3 py-1">Developers</span>
                <span className="rounded-full bg-muted px-3 py-1">Privacy-aware previews</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={searchMode}
          onValueChange={(value) =>
            setSearchMode(value as "developers" | "teams")
          }
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="developers">Developers</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap gap-2">
              {searchMode === "teams"
                ? teamFilters.map((filter) => (
                    <Button
                      key={filter}
                      type="button"
                      variant={
                        selectedTeamFilters.includes(filter) ? "default" : "outline"
                      }
                      size="sm"
                      className="gap-2"
                      onClick={() => toggleFilter(filter, setSelectedTeamFilters)}
                    >
                      <Filter className="h-4 w-4" />
                      {filter}
                    </Button>
                  ))
                : isLeader ? null : ["Visible", "Hidden"].map((filter) => (
                    <Button
                      key={filter}
                      type="button"
                      variant={
                        selectedDeveloperFilters.includes(filter)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        toggleFilter(filter, setSelectedDeveloperFilters)
                      }
                    >
                      <Filter className="h-4 w-4" />
                      {filter}
                    </Button>
                  ))}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  searchMode === "teams"
                    ? "Search by team name or development goal..."
                    : "Search by name, skill, role, or university..."
                }
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value="developers" className="mt-6 space-y-4">
            {isLeader && <DeveloperOfferSearch query={query} />}
            {!isLeader && (
            <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredDevelopers.length} developer
                {filteredDevelopers.length === 1 ? "" : "s"} matched your search.
              </p>
              <Link
                href="/settings"
                className="text-sm font-medium text-primary hover:underline"
              >
                Tune profile visibility
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredDevelopers.map((developer) => (
                <Card
                  key={developer.id}
                  className="border-border bg-card transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={developer.avatar} alt={developer.full_name} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {initials(developer.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {developer.full_name}
                            </h3>
                            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                              <GraduationCap className="h-3.5 w-3.5" />
                              <span>{developer.university}</span>
                            </div>
                          </div>
                          <Badge
                            variant={developer.visible ? "secondary" : "outline"}
                          >
                            {developer.visible ? "Visible" : "Hidden"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {developer.location} · {developer.experience}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {developer.roles.map((role) => (
                        <span
                          key={role}
                          className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                        >
                          {role}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {developer.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            </>
            )}
          </TabsContent>

          <TabsContent value="teams" className="mt-6 space-y-4">
            {teamLoading ? (
              <Card className="border-border bg-card">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Loading teams...
                </CardContent>
              </Card>
            ) : teamError ? (
              <Card className="border-border bg-card">
                <CardContent className="p-6 text-sm text-destructive">
                  {teamError}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredTeams.length} team
                    {filteredTeams.length === 1 ? "" : "s"} matched your search.
                  </p>
                  <Button asChild size="sm" className="gap-2">
                    <Link href="/dashboard">
                      <Briefcase className="h-4 w-4" />
                      Go to team dashboard
                    </Link>
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredTeams.map((team) => {
                    const visibility = visibilityBadge(team.visibility)
                    const VisibilityIcon = visibility.icon
                    const isExpanded = expandedTeamId === team.id
                    const publicPostings = (team.job_postings ?? []).filter(
                      (p) => p.is_public && p.status === "OPEN",
                    )

                    return (
                      <Card
                        key={team.id}
                        className="border-border bg-card transition-all hover:border-primary/30 hover:shadow-md"
                      >
                        <CardContent className="space-y-4 p-6">
                          <div
                            className="flex items-start justify-between gap-3 cursor-pointer"
                            onClick={() => toggleExpand(team.id)}
                          >
                            <div>
                              <h3 className="font-semibold text-foreground">{team.name}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {team.development_goal ?? "No development goal provided"}
                              </p>
                            </div>
                            <Badge
                              variant={
                                team.visibility === "PRIVATE" ? "outline" : "secondary"
                              }
                            >
                              <VisibilityIcon className="mr-1 h-3.5 w-3.5" />
                              {visibility.label}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {team.redacted
                              ? "Private team details are hidden until you join or receive access."
                              : team.description ?? "No project description provided."}
                          </p>

                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>
                                {team.redacted || team.member_count === null
                                  ? "Member details hidden"
                                  : `${team.member_count} member${team.member_count === 1 ? "" : "s"}`}
                              </span>
                            </div>
                            {publicPostings.length > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleExpand(team.id) }}
                                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                <Briefcase className="h-3.5 w-3.5" />
                                {publicPostings.length} open position{publicPostings.length === 1 ? "" : "s"}
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>

                          {!team.redacted && team.members.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {team.members.slice(0, 4).map((member) => (
                                <span
                                  key={member.id}
                                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                                >
                                  {member.is_registered
                                    ? "Registered member"
                                    : member.unregistered_name ?? "Unregistered member"}
                                </span>
                              ))}
                              {team.members.length > 4 && (
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                  +{team.members.length - 4} more
                                </span>
                              )}
                            </div>
                          )}

                          {isExpanded && publicPostings.length > 0 && (
                            <div className="space-y-2 border-t border-border pt-3">
                              <p className="text-xs font-medium text-muted-foreground">Open Positions</p>
                              {applyMessage && publicPostings.some((p) => p.id === applyMessage.postingId) && (
                                <p className={`text-xs ${applyMessage.isError ? "text-destructive" : "text-green-600"}`}>
                                  {applyMessage.text}
                                </p>
                              )}
                              {publicPostings.map((posting) => {
                                const isApplied = appliedPostingIds.has(posting.id)
                                const isLoading = applyLoadingId === posting.id
                                return (
                                  <div
                                    key={posting.id}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/60 p-3"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-foreground">{posting.title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {posting.required_role} &middot; {posting.min_skill_level}
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant={isApplied ? "outline" : "default"}
                                      className="shrink-0 gap-1.5"
                                      disabled={isApplied || isLoading}
                                      onClick={(e) => { e.stopPropagation(); handleApply(posting.id) }}
                                    >
                                      {isApplied ? (
                                        <><CheckCircle2 className="h-3.5 w-3.5" /> Applied</>
                                      ) : isLoading ? (
                                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Applying...</>
                                      ) : (
                                        <><Send className="h-3.5 w-3.5" /> Apply</>
                                      )}
                                    </Button>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
