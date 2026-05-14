import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"

interface GitHubLinkProps {
  username: string
}

export function GitHubLink({ username }: GitHubLinkProps) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:justify-between">
      <div className="text-center sm:text-left">
        <h3 className="font-semibold text-foreground">Connect on GitHub</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Check out more of my work and contributions
        </p>
      </div>
      <Button asChild className="gap-2">
        <a
          href={`https://github.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github className="h-4 w-4" />
          @{username}
        </a>
      </Button>
    </section>
  )
}
