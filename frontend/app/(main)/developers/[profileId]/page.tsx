"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Link as LinkIcon,
  Loader2,
} from "lucide-react"
import { getDeveloperProfile, type DeveloperProfileView } from "@/lib/api"

function initials(name: string | null) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function DeveloperProfilePage() {
  const params = useParams<{ profileId: string }>()
  const profileId = params?.profileId ?? ""

  const [profile, setProfile] = useState<DeveloperProfileView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) return
    let cancelled = false
    setLoading(true)
    getDeveloperProfile(profileId)
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this developer's profile.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [profileId])

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Link>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="mt-6 border-border bg-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      ) : profile ? (
        <div className="mt-4 space-y-6">
          {/* Hero */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                  {initials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground">
                  {profile.full_name ?? "Anonymous developer"}
                </h1>
                {profile.years_experience != null && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.years_experience} year
                    {profile.years_experience === 1 ? "" : "s"} of experience
                  </p>
                )}
              </div>
            </div>

            {profile.roles.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {profile.roles.map((role) => (
                  <Badge key={`${role.name}-${role.skill_level}`} variant="secondary">
                    {role.name} · {role.skill_level}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          {/* Skills */}
          {profile.skills.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Skills
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {profile.education.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Education</h2>
              </div>
              <div className="mt-3 space-y-3">
                {profile.education.map((edu, idx) => (
                  <div key={idx} className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-sm font-medium text-foreground">
                      {edu.institution_name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[edu.degree, edu.major, edu.graduation_year]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {profile.projects.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Projects</h2>
              </div>
              <div className="mt-3 space-y-3">
                {profile.projects.map((project, idx) => (
                  <div key={idx} className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-sm font-medium text-foreground">
                      {project.project_name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[project.role, project.duration].filter(Boolean).join(" · ")}
                    </p>
                    {project.technologies_used && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {project.technologies_used}
                      </p>
                    )}
                    {project.description && (
                      <p className="mt-2 text-sm leading-relaxed text-foreground">
                        {project.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Links */}
          {profile.links.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Links</h2>
              </div>
              <div className="mt-3 space-y-2">
                {profile.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url_str}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm text-primary hover:underline"
                  >
                    {link.url_type}: {link.url_str}
                  </a>
                ))}
              </div>
            </section>
          )}

          {profile.roles.length === 0 &&
            profile.skills.length === 0 &&
            profile.education.length === 0 &&
            profile.projects.length === 0 &&
            profile.links.length === 0 && (
              <Card className="border-border bg-card">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  This developer hasn&apos;t added profile details yet.
                </CardContent>
              </Card>
            )}
        </div>
      ) : null}
    </main>
  )
}
