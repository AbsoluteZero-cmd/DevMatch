import { Badge } from "@/components/ui/badge";
import type { RoleRead } from "@/lib/profile-types";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface RolesSectionProps {
  roles: RoleRead[];
}

const tierStyles: Record<RoleRead["tier"], string> = {
  Core: "border-primary/20 bg-primary/5 text-primary",
  Specialized: "border-secondary/30 bg-secondary/10 text-secondary-foreground",
};

export function RolesSection({ roles }: RolesSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Roles</h2>
        <span className="text-sm text-muted-foreground">
          {roles.length} roles
        </span>
      </div>

      {roles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
          No roles have been assigned to this profile yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <article
              key={role.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {role.name}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {role.tier} role matched to the backend profile model.
                  </p>
                </div>

                <Badge
                  className={cn(
                    "rounded-full border px-2.5 py-1",
                    tierStyles[role.tier],
                  )}
                >
                  {role.skill_level}
                </Badge>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
