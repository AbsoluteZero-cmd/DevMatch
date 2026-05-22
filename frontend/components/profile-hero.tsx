import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ProfileHeroProps {
  name: string;
  summary: string;
  avatarUrl?: string;
  stats?: Array<{
    label: string;
    value: string;
  }>;
}

export function ProfileHero({
  name,
  summary,
  avatarUrl,
  stats,
}: ProfileHeroProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-secondary/10 p-6 sm:p-8">
      <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-secondary/20 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Profile Picture */}
        <Avatar className="h-28 w-28 ring-4 ring-card shadow-xl sm:h-32 sm:w-32">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {name}
          </h1>

          <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-foreground/80">
            {summary}
          </p>

          {stats && stats.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    "rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-left shadow-sm backdrop-blur",
                  )}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-base font-semibold text-foreground">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
