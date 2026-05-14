import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Github, Folder } from "lucide-react"

interface Project {
  name: string
  description: string
  technologies: string[]
  githubUrl?: string
  liveUrl?: string
}

interface ProjectsSectionProps {
  projects: Project[]
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Projects</h2>
        <span className="text-sm text-muted-foreground">{projects.length} projects</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <Card
            key={project.name}
            className="group overflow-hidden border-border bg-card transition-all hover:border-primary/30 hover:shadow-md"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Folder className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base font-semibold">{project.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={`View ${project.name} on GitHub`}
                    >
                      <Github className="h-4 w-4" />
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={`View ${project.name} live demo`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
              <CardDescription className="mt-2 line-clamp-2 text-sm leading-relaxed">
                {project.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
