import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, Github, Folder, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface Project {
  id?: number;
  name: string;
  description: string;
  duration?: string | null;
  role?: string | null;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  is_hidden?: boolean;
}

interface ProjectsSectionProps {
  projects: Project[];
  title?: string;
  emptyMessage?: string;
  editMode?: boolean;
  onCreate?: (payload: any) => Promise<void> | void;
  onUpdate?: (projectId: number, payload: any) => Promise<void> | void;
  onDelete?: (projectId: number) => Promise<void> | void;
  onToggleVisibility?: (projectId: number, isHidden: boolean) => Promise<void> | void;
}

export function ProjectsSection({
  projects,
  title = "Projects",
  emptyMessage = "No projects have been added yet.",
  editMode,
  onCreate,
  onUpdate,
  onDelete,
  onToggleVisibility,
}: ProjectsSectionProps) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState({
    project_name: "",
    duration: "",
    role: "",
    technologies_used: "",
    description: "",
  });
  const [newProject, setNewProject] = useState({
    project_name: "",
    duration: "",
    role: "",
    technologies_used: "",
    description: "",
  });

  useEffect(() => {
    if (editingId === null) {
      setEditingProject({
        project_name: "",
        duration: "",
        role: "",
        technologies_used: "",
        description: "",
      });
      return;
    }

    const currentProject = projects.find((project) => project.id === editingId);
    if (!currentProject) {
      setEditingId(null);
      return;
    }

    setEditingProject({
      project_name: currentProject.name,
      duration: currentProject.duration ?? "",
      role: currentProject.role ?? "",
      technologies_used: currentProject.technologies.join(", "),
      description: currentProject.description,
    });
  }, [editingId, projects]);

  const startEdit = (project: Project) => {
    setCreating(false);
    setEditingId(project.id ?? null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const buildEditPayload = () => ({
    project_name: editingProject.project_name,
    duration: editingProject.duration,
    role: editingProject.role,
    technologies_used: editingProject.technologies_used,
    description: editingProject.description,
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-sm text-muted-foreground">
          {projects.length} projects
        </span>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Card
              key={project.id ?? project.name}
              className={cn(
                "group overflow-hidden border-border bg-card transition-all hover:border-primary/30 hover:shadow-md",
                project.is_hidden && "opacity-50",
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Folder className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold">
                      {project.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {editMode && onUpdate && onDelete ? (
                      <div className="flex gap-2">
                        {onToggleVisibility && project.id && (
                          <button
                            aria-label={project.is_hidden ? "Show project" : "Hide project"}
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => onToggleVisibility(project.id!, !project.is_hidden)}
                          >
                            {project.is_hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        )}
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={async () => {
                            startEdit(project);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded border px-2 py-1 text-xs text-red-600"
                          onClick={async () => {
                            if (!project.id) return;
                            await onDelete(project.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
                <CardDescription className="mt-2 line-clamp-2 text-sm leading-relaxed">
                  {project.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {(project.role || project.duration) && (
                  <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {project.role && (
                      <span className="rounded-full border border-border bg-background px-2.5 py-1">
                        Role: {project.role}
                      </span>
                    )}
                    {project.duration && (
                      <span className="rounded-full border border-border bg-background px-2.5 py-1">
                        Duration: {project.duration}
                      </span>
                    )}
                  </div>
                )}
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
      )}

      {editMode && editingId !== null && onUpdate && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Edit project
          </h3>
          <input
            className="w-full rounded border px-2 py-1"
            placeholder="Project name"
            value={editingProject.project_name}
            onChange={(event) =>
              setEditingProject((state) => ({
                ...state,
                project_name: event.target.value,
              }))
            }
          />
          <input
            className="w-full rounded border px-2 py-1"
            placeholder="Role"
            value={editingProject.role}
            onChange={(event) =>
              setEditingProject((state) => ({
                ...state,
                role: event.target.value,
              }))
            }
          />
          <input
            className="w-full rounded border px-2 py-1"
            placeholder="Duration"
            value={editingProject.duration}
            onChange={(event) =>
              setEditingProject((state) => ({
                ...state,
                duration: event.target.value,
              }))
            }
          />
          <input
            className="w-full rounded border px-2 py-1"
            placeholder="Technologies (comma separated)"
            value={editingProject.technologies_used}
            onChange={(event) =>
              setEditingProject((state) => ({
                ...state,
                technologies_used: event.target.value,
              }))
            }
          />
          <textarea
            className="w-full rounded border px-2 py-1"
            placeholder="Description"
            value={editingProject.description}
            onChange={(event) =>
              setEditingProject((state) => ({
                ...state,
                description: event.target.value,
              }))
            }
          />
          <div className="flex gap-2">
            <button
              className="rounded bg-green-600 px-3 py-1 text-white"
              onClick={async () => {
                if (!editingId) {
                  return;
                }

                try {
                  await onUpdate(editingId, buildEditPayload());
                  setEditingId(null);
                } catch (err) {
                  console.error(err);
                  alert("Failed to update project");
                }
              }}
            >
              Save
            </button>
            <button className="rounded border px-3 py-1" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {editMode && onCreate && (
        <div className="mt-4">
          {!creating ? (
            <button
              className="rounded bg-primary/90 px-3 py-1 text-white"
              onClick={() => setCreating(true)}
            >
              Add project
            </button>
          ) : (
            <div className="mt-2 space-y-2">
              <input
                className="w-full rounded border px-2 py-1"
                placeholder="Project name"
                value={newProject.project_name}
                onChange={(e) =>
                  setNewProject((s) => ({ ...s, project_name: e.target.value }))
                }
              />
              <input
                className="w-full rounded border px-2 py-1"
                placeholder="Role"
                value={newProject.role}
                onChange={(e) =>
                  setNewProject((s) => ({ ...s, role: e.target.value }))
                }
              />
              <input
                className="w-full rounded border px-2 py-1"
                placeholder="Duration"
                value={newProject.duration}
                onChange={(e) =>
                  setNewProject((s) => ({ ...s, duration: e.target.value }))
                }
              />
              <input
                className="w-full rounded border px-2 py-1"
                placeholder="Technologies (comma separated)"
                value={newProject.technologies_used}
                onChange={(e) =>
                  setNewProject((s) => ({
                    ...s,
                    technologies_used: e.target.value,
                  }))
                }
              />
              <textarea
                className="w-full rounded border px-2 py-1"
                placeholder="Description"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject((s) => ({ ...s, description: e.target.value }))
                }
              />
              <div className="flex gap-2">
                <button
                  className="rounded bg-green-600 px-3 py-1 text-white"
                  onClick={async () => {
                    try {
                      await onCreate(newProject);
                      setNewProject({
                        project_name: "",
                        duration: "",
                        role: "",
                        technologies_used: "",
                        description: "",
                      });
                      setCreating(false);
                    } catch (err) {
                      console.error(err);
                      alert("Failed to create project");
                    }
                  }}
                >
                  Create
                </button>
                <button
                  className="rounded border px-3 py-1"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
