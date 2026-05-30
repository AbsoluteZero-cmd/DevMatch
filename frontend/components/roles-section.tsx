import { Badge } from "@/components/ui/badge";
import type { RoleRead, SkillLevel } from "@/lib/profile-types";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Layout,
  Server,
  Code,
  Smartphone,
  Container,
  Database,
  Brain,
  FlaskConical,
  Shield,
  CheckCircle2,
} from "lucide-react";
import type { ElementType } from "react";

interface RolesSectionProps {
  roles: RoleRead[];
}

const tierStyles: Record<RoleRead["tier"], string> = {
  Core: "border-primary/20 bg-primary/5 text-primary",
  Specialized: "border-secondary/30 bg-secondary/10 text-secondary-foreground",
};

const levelBadgeStyles: Record<SkillLevel, string> = {
  Beginner: "border-gray-200 bg-gray-50 text-gray-600",
  Intermediate: "border-blue-200 bg-blue-50 text-blue-700",
  Advanced: "border-purple-200 bg-purple-50 text-purple-700",
  Expert: "border-green-200 bg-green-50 text-green-700",
};

const roleIcons: Record<string, ElementType> = {
  "Frontend Engineer": Layout,
  "Backend Engineer": Server,
  "Full-Stack Engineer": Code,
  "Mobile Engineer (iOS / Android)": Smartphone,
  "DevOps / Infrastructure Engineer": Container,
  "Data Engineer": Database,
  "ML / AI Engineer": Brain,
  "Data Scientist": FlaskConical,
  "Security Engineer": Shield,
  "QA Engineer": CheckCircle2,
};

export function RolesSection({ roles }: RolesSectionProps) {
  // FR-33: Filter out Beginner roles (score < 25).
  // The backend already filters, but this is a defensive check.
  const displayRoles = roles.filter((role) => role.skill_level !== "Beginner");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Roles</h2>
        <span className="text-sm text-muted-foreground">
          {displayRoles.length} roles
        </span>
      </div>

      {displayRoles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
          No roles have been assigned to this profile yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayRoles.map((role) => {
            const Icon = roleIcons[role.name] ?? Sparkles;
            return (
              <article
                key={role.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground">
                        {role.name}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {role.tier} role
                    </p>
                  </div>

                  <Badge
                    className={cn(
                      "rounded-full border px-2.5 py-1",
                      levelBadgeStyles[role.skill_level] ?? tierStyles[role.tier],
                    )}
                  >
                    {role.skill_level}
                  </Badge>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
