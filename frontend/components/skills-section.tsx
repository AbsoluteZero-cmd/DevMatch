import { cn } from "@/lib/utils"

type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert"

interface Skill {
  name: string
  level: SkillLevel
}

interface SkillsSectionProps {
  skills: Skill[]
}

const levelStyles: Record<SkillLevel, { bg: string; text: string; badge: string }> = {
  Beginner: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    badge: "bg-muted-foreground/20 text-muted-foreground",
  },
  Intermediate: {
    bg: "bg-secondary",
    text: "text-secondary-foreground",
    badge: "bg-primary/20 text-primary",
  },
  Advanced: {
    bg: "bg-primary/10",
    text: "text-primary",
    badge: "bg-primary/30 text-primary",
  },
  Expert: {
    bg: "bg-primary",
    text: "text-primary-foreground",
    badge: "bg-primary-foreground/20 text-primary-foreground",
  },
}

export function SkillsSection({ skills }: SkillsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Skills</h2>
        <span className="text-sm text-muted-foreground">{skills.length} skills</span>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {skills.map((skill) => {
          const styles = levelStyles[skill.level]
          return (
            <div
              key={skill.name}
              className={cn(
                "group flex items-center gap-2 rounded-full px-4 py-2 transition-all hover:scale-105",
                styles.bg
              )}
            >
              <span className={cn("font-medium", styles.text)}>{skill.name}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  styles.badge
                )}
              >
                {skill.level}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
        <span className="font-medium">Skill Levels:</span>
        {(["Beginner", "Intermediate", "Advanced", "Expert"] as SkillLevel[]).map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                level === "Beginner" && "bg-muted-foreground/40",
                level === "Intermediate" && "bg-primary/40",
                level === "Advanced" && "bg-primary/70",
                level === "Expert" && "bg-primary"
              )}
            />
            <span>{level}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
