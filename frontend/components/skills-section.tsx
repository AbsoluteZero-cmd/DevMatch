"use client";

import { getAllSkillTags } from "@/lib/api";
import type { SkillTagRead } from "@/lib/profile-types";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface SkillsSectionProps {
  skills: SkillTagRead[];
  editMode?: boolean;
  onSave?: (tags: string[]) => Promise<void> | void;
}

export function SkillsSection({
  skills,
  editMode,
  onSave,
}: SkillsSectionProps) {
  const [catalog, setCatalog] = useState<SkillTagRead[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draftTags, setDraftTags] = useState<SkillTagRead[]>(skills);

  const normalizeTagNames = (tags: SkillTagRead[]) => {
    return tags
      .map((tag) => tag.name.trim().toLowerCase())
      .filter(Boolean)
      .sort();
  };

  useEffect(() => {
    setDraftTags(skills);
  }, [skills, editMode]);

  useEffect(() => {
    let isActive = true;

    const loadCatalog = async () => {
      setCatalogLoading(true);
      setCatalogError(null);

      try {
        const allTags = await getAllSkillTags<SkillTagRead[]>();
        if (isActive) {
          setCatalog(allTags);
        }
      } catch (error) {
        if (isActive) {
          setCatalogError(
            error instanceof Error
              ? error.message
              : "Failed to load skill catalog.",
          );
        }
      } finally {
        if (isActive) {
          setCatalogLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      isActive = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const hasUnsavedChanges = useMemo(() => {
    const draftNames = normalizeTagNames(draftTags);
    const currentNames = normalizeTagNames(skills);

    if (draftNames.length !== currentNames.length) {
      return true;
    }

    return draftNames.some((name, index) => name !== currentNames[index]);
  }, [draftTags, skills]);

  const suggestionList = useMemo(() => {
    const selectedNames = new Set(
      draftTags.map((tag) => tag.name.toLowerCase()),
    );

    const scoreTag = (name: string) => {
      const normalizedName = name.toLowerCase();
      const exact = normalizedName === normalizedQuery;
      const prefix = normalizedName.startsWith(normalizedQuery);
      const index = normalizedName.indexOf(normalizedQuery);
      return {
        exact,
        prefix,
        index,
        lengthDelta: Math.abs(normalizedName.length - normalizedQuery.length),
      };
    };

    return catalog
      .filter((tag) => !selectedNames.has(tag.name.toLowerCase()))
      .filter((tag) => {
        if (!normalizedQuery) {
          return true;
        }
        return tag.name.toLowerCase().includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (!normalizedQuery) {
          return left.name.localeCompare(right.name);
        }

        const leftScore = scoreTag(left.name);
        const rightScore = scoreTag(right.name);

        if (leftScore.exact !== rightScore.exact) {
          return leftScore.exact ? -1 : 1;
        }
        if (leftScore.prefix !== rightScore.prefix) {
          return leftScore.prefix ? -1 : 1;
        }
        if (leftScore.index !== rightScore.index) {
          return leftScore.index - rightScore.index;
        }
        if (leftScore.lengthDelta !== rightScore.lengthDelta) {
          return leftScore.lengthDelta - rightScore.lengthDelta;
        }
        return left.name.localeCompare(right.name);
      })
      .slice(0, 8);
  }, [catalog, draftTags, normalizedQuery]);

  const addDraftTag = (tag: SkillTagRead) => {
    setDraftTags((current) => {
      const exists = current.some(
        (item) => item.name.toLowerCase() === tag.name.toLowerCase(),
      );
      if (exists) {
        return current;
      }
      return [...current, tag];
    });
    setQuery("");
  };

  const addFreeformTag = () => {
    const nextName = query.trim();
    if (!nextName) {
      return;
    }

    const existing = draftTags.some(
      (tag) => tag.name.toLowerCase() === nextName.toLowerCase(),
    );
    if (existing) {
      setQuery("");
      return;
    }

    setDraftTags((current) => [
      ...current,
      {
        id: -Date.now(),
        name: nextName,
        is_ai_generated: false,
      },
    ]);
    setQuery("");
  };

  const removeDraftTag = (tagName: string) => {
    setDraftTags((current) => current.filter((tag) => tag.name !== tagName));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Skills</h2>
        <span className="text-sm text-muted-foreground">
          {draftTags.length} tags
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {draftTags.map((skill) => {
          return (
            <div
              key={skill.name}
              className={cn(
                "group flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:bg-primary/5",
                skill.is_ai_generated && "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950",
              )}
            >
              <span className="mr-2">{skill.name}</span>
              {skill.is_ai_generated && (
                <span className="mr-1 inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI
                </span>
              )}
              {editMode && (
                <button
                  aria-label={`Remove ${skill.name}`}
                  onClick={() => removeDraftTag(skill.name)}
                  className="rounded px-2 py-0.5 text-xs text-red-500"
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editMode && (
        <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Add a skill
              </p>
              <p className="text-xs text-muted-foreground">
                Search the catalog or type a new skill name.
              </p>
            </div>
            {catalogLoading && (
              <span className="text-xs text-muted-foreground">
                Loading catalog...
              </span>
            )}
          </div>

          <div className="relative">
            <input
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
              placeholder="Type to search skills"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addFreeformTag();
                }
              }}
            />

            {normalizedQuery.length > 0 && suggestionList.length > 0 && (
              <div className="absolute z-10 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
                {suggestionList.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => addDraftTag(tag)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-primary/5"
                  >
                    <span>{tag.name}</span>
                    <span className="text-xs text-muted-foreground">
                      existing
                    </span>
                  </button>
                ))}
              </div>
            )}

            {normalizedQuery.length > 0 && suggestionList.length === 0 && (
              <div className="absolute z-10 mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-lg">
                No matches found. Press Enter to add "{query.trim()}" as a new
                skill.
              </div>
            )}
          </div>

          {catalogError && (
            <p className="text-xs text-red-500">{catalogError}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
              onClick={addFreeformTag}
            >
              Add typed skill
            </button>
            <button
              type="button"
              disabled={!onSave || !hasUnsavedChanges}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/40"
              onClick={async () => {
                if (!onSave) {
                  return;
                }
                await onSave(draftTags.map((tag) => tag.name));
              }}
            >
              Save skills
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
